package com.airline.pricing;

import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.pdf.InvoicePdfService;
import com.airline.service.InvoiceDispatchService;
import com.airline.xml.IsXmlGeneratorService;
import com.airline.service.InvoiceService;
import com.airline.pricing.evaluators.MtowBasedEvaluator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * INV-05: PF-07 Tail ID Requirement
 * Verifies that formulas referencing tail IDs require a valid tail ID during calculation.
 */
@ExtendWith(MockitoExtension.class)
public class MtowLookupTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private PricingEngine pricingEngine;

    @Mock
    private com.airline.security.TenantContext tenantContext;

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

    @Mock
    private com.airline.repository.MtowRecordRepository mtowRecordRepository;

    @Mock
    private com.airline.repository.AircraftTypeMtowDefaultRepository aircraftTypeMtowDefaultRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    @Test
    void testPf07RequiresTailNumber_INV_05() {
        ServiceConfiguration mtowService = ServiceConfiguration.builder()
                .chargeCode("LDG")
                .serviceName("Landing Charge")
                .formulaType(FormulaType.PF_07)
                .build();

        Contract approvedContract = Contract.builder()
                .id("c-100")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().plusDays(10))
                .currency("AED")
                .services(List.of(mtowService))
                .build();

        InvoiceLineItem item = InvoiceLineItem.builder()
                .contractId("c-100")
                .flightDate(LocalDate.now())
                .chargeCode("LDG")
                .quantityDrivers("{\"weight\": 150.0}") // Missing tailNumber
                .build();

        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .currency("AED")
                .lineItems(List.of(item))
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-100", "SWISSPORT")).thenReturn(Optional.of(approvedContract));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Aircraft registration is required for formula type PF-07");
    }

    @Test
    void unknownTailFallsBackToAircraftTypeReferenceWeight_INV_05() {
        when(mtowRecordRepository.findById("UNKNOWN-TAIL")).thenReturn(Optional.empty());
        when(aircraftTypeMtowDefaultRepository.findById("A380")).thenReturn(Optional.of(
                AircraftTypeMtowDefault.builder().aircraftType("A380")
                        .weight(new BigDecimal("575.00")).build()));
        ServiceConfiguration config = ServiceConfiguration.builder()
                .formulaType(FormulaType.PF_07)
                .rateDetails(Map.of("rate", "2.00"))
                .build();
        MtowBasedEvaluator evaluator = new MtowBasedEvaluator(
                mtowRecordRepository, aircraftTypeMtowDefaultRepository);

        assertThat(evaluator.evaluate(config,
                Map.of("tailNumber", "unknown-tail", "aircraftType", "a380")))
                .isEqualByComparingTo("1150.00");
    }

    @Test
    void unknownTailAndAircraftTypeFailClosed_INV_05() {
        when(mtowRecordRepository.findById("UNKNOWN-TAIL")).thenReturn(Optional.empty());
        when(aircraftTypeMtowDefaultRepository.findById("A380")).thenReturn(Optional.empty());
        ServiceConfiguration config = ServiceConfiguration.builder()
                .formulaType(FormulaType.PF_07)
                .rateDetails(Map.of("rate", "2.00"))
                .build();
        MtowBasedEvaluator evaluator = new MtowBasedEvaluator(
                mtowRecordRepository, aircraftTypeMtowDefaultRepository);

        assertThatThrownBy(() -> evaluator.evaluate(config,
                Map.of("tailNumber", "unknown-tail", "aircraftType", "a380")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No aircraft-type fallback");
    }
}
