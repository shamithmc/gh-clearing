package com.airline.pricing;

import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
        when(contractRepository.findById("c-100")).thenReturn(Optional.of(approvedContract));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PF-07 requires 'tailNumber' input in quantity drivers");
    }
}
