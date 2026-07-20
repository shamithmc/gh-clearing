package com.airline.invoices;

import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.pricing.PricingEngine;
import com.airline.security.TenantContext;
import com.airline.pdf.InvoicePdfService;
import com.airline.service.InvoiceDispatchService;
import com.airline.xml.IsXmlGeneratorService;
import com.airline.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * INV-06: Cross-Currency Exchange Rate Mandate
 * Verifies that exchange rates are provided and applied for cross-currency invoices.
 */
@ExtendWith(MockitoExtension.class)
public class CrossCurrencyValidationTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private PricingEngine pricingEngine;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private IsXmlGeneratorService xmlGeneratorService;

    @Mock
    private InvoicePdfService pdfService;

    @Mock
    private InvoiceDispatchService dispatchService;

    @Mock
    private com.airline.security.DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @InjectMocks
    private InvoiceService invoiceService;

    private Contract approvedContract;
    private ServiceConfiguration passengersService;

    @BeforeEach
    void setUp() {
        passengersService = ServiceConfiguration.builder()
                .chargeCode("PAX")
                .serviceName("Passenger Handling")
                .formulaType(FormulaType.PF_01)
                .build();

        approvedContract = Contract.builder()
                .id("c-100")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().plusDays(10))
                .currency("AED")
                .services(List.of(passengersService))
                .build();
    }

    @Test
    void testCrossCurrencyMandateMissingExchangeRate_INV_06() {
        InvoiceLineItem item = InvoiceLineItem.builder()
                .contractId("c-100")
                .chargeCode("PAX")
                .quantityDrivers("{\"passengers\": 100}")
                .build();

        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .currency("USD") // Contract currency is AED
                .lineItems(List.of(item))
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-100", "SWISSPORT")).thenReturn(Optional.of(approvedContract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("1500.00"));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Exchange rate must be provided and positive when invoice and contract currencies differ");
    }

    @Test
    void testCrossCurrencyCalculationSucceeds_INV_06() {
        InvoiceLineItem item = InvoiceLineItem.builder()
                .contractId("c-100")
                .chargeCode("PAX")
                .quantityDrivers("{\"passengers\": 100}")
                .build();

        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .currency("USD") // Contract currency is AED
                .exchangeRate(new BigDecimal("0.27")) // 1 AED = 0.27 USD
                .exchangeRateSource("ECB")
                .lineItems(List.of(item))
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-100", "SWISSPORT")).thenReturn(Optional.of(approvedContract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("1000.00"));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice result = invoiceService.createInvoice(invoice);

        // 1000.00 AED * 0.27 = 270.00 USD
        assertThat(result.getTotalAmount()).isEqualTo(new BigDecimal("270.00"));
        assertThat(result.getLineItems().get(0).getCalculatedAmount()).isEqualTo(new BigDecimal("270.00"));
    }

    @Test
    void crossCurrencyMissingExchangeRateSourceFails_INV_06() {
        InvoiceLineItem item = InvoiceLineItem.builder().contractId("c-100").chargeCode("PAX")
                .quantityDrivers("{\"passengers\": 100}").build();
        Invoice invoice = Invoice.builder().invoiceNumber("INV-101").supplierId("SWISSPORT")
                .airlineId("EK").airportCode("DXB").issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30)).currency("USD")
                .exchangeRate(new BigDecimal("0.27")).lineItems(List.of(item)).build();
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-100", "SWISSPORT")).thenReturn(Optional.of(approvedContract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("1000.00"));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Exchange rate source");
    }
}
