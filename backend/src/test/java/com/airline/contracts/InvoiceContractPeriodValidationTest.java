package com.airline.contracts;

import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.FormulaType;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.PricingEngine;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.DocumentGenerationJob;
import com.airline.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceContractPeriodValidationTest {

    private static final LocalDate CONTRACT_START = LocalDate.of(2026, 1, 1);
    private static final LocalDate CONTRACT_END = LocalDate.of(2026, 1, 31);

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private PricingEngine pricingEngine;
    @Mock private TenantContext tenantContext;
    @Mock private InvoiceAuditLogRepository invoiceAuditLogRepository;
    @Mock private DocumentGenerationJob documentGenerationJob;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock private ApplicationEventPublisher applicationEventPublisher;

    private InvoiceService invoiceService;
    private Contract contract;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(
                invoiceRepository,
                contractRepository,
                pricingEngine,
                tenantContext,
                new ObjectMapper(),
                invoiceAuditLogRepository,
                documentGenerationJob,
                dimensionalSecurityEvaluator,
                applicationEventPublisher,
                null);
        contract = Contract.builder()
                .id("contract-1")
                .groundHandlerId("supplier-1")
                .airlineId("airline-1")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .startDate(CONTRACT_START)
                .endDate(CONTRACT_END)
                .currency("USD")
                .services(List.of(ServiceConfiguration.builder()
                        .chargeCode("PAX")
                        .serviceName("Passenger Handling")
                        .formulaType(FormulaType.PF_01)
                        .build()))
                .build();
        when(tenantContext.getCurrentTenantId()).thenReturn("supplier-1");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
    }

    @Test
    void acceptsFlightDatesOnBothContractBoundaries() {
        Invoice invoice = invoice(
                line("line-start", CONTRACT_START),
                line("line-end", CONTRACT_END));
        stubSuccessfulCalculation();

        Invoice saved = invoiceService.createInvoice(invoice);

        assertThat(saved.getTotalAmount()).isEqualByComparingTo("200.00");
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void rejectsFlightDateBeforeContractStart() {
        assertInvalidFlightDate(CONTRACT_START.minusDays(1));
    }

    @Test
    void rejectsFlightDateAfterContractEnd() {
        assertInvalidFlightDate(CONTRACT_END.plusDays(1));
    }

    @Test
    void rejectsMissingFlightDateBeforePersistence() {
        Invoice invoice = invoice(line("line-missing", null));
        when(contractRepository.findByIdAndTenantId("contract-1", "supplier-1"))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("flight date is required");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void rejectsMixedValidityInvoiceAtomically() {
        Invoice invoice = invoice(
                line("line-valid", CONTRACT_START.plusDays(1)),
                line("line-invalid", CONTRACT_END.plusDays(1)));
        when(contractRepository.findByIdAndTenantId("contract-1", "supplier-1"))
                .thenReturn(Optional.of(contract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("100.00"));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("flight date must fall within contract validity period");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void appliesFlightDateValidationToDraftUpdates() {
        Invoice existing = invoice(line("existing-line", CONTRACT_START.plusDays(1)));
        existing.setId("invoice-1");
        existing.setStatus(InvoiceStatus.DRAFT);
        Invoice update = invoice(line("updated-line", CONTRACT_END.plusDays(1)));
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "supplier-1"))
                .thenReturn(Optional.of(existing));
        when(contractRepository.findByIdAndTenantId("contract-1", "supplier-1"))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> invoiceService.updateInvoice("invoice-1", update))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("flight date must fall within contract validity period");
        verify(invoiceRepository, never()).save(any());
    }

    private void assertInvalidFlightDate(LocalDate flightDate) {
        Invoice invoice = invoice(line("line-invalid", flightDate));
        when(contractRepository.findByIdAndTenantId("contract-1", "supplier-1"))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("flight date must fall within contract validity period");
        verify(invoiceRepository, never()).save(any());
    }

    private void stubSuccessfulCalculation() {
        when(contractRepository.findByIdAndTenantId("contract-1", "supplier-1"))
                .thenReturn(Optional.of(contract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("100.00"));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Invoice invoice(InvoiceLineItem... lineItems) {
        return Invoice.builder()
                .invoiceNumber("INV-060")
                .supplierId("supplier-1")
                .airlineId("airline-1")
                .airportCode("DXB")
                .currency("USD")
                .issueDate(CONTRACT_START.plusDays(5))
                .dueDate(CONTRACT_END.plusDays(30))
                .lineItems(new ArrayList<>(List.of(lineItems)))
                .build();
    }

    private InvoiceLineItem line(String id, LocalDate flightDate) {
        return InvoiceLineItem.builder()
                .id(id)
                .contractId("contract-1")
                .flightDate(flightDate)
                .chargeCode("PAX")
                .quantityDrivers("{\"passengers\": 10}")
                .build();
    }
}
