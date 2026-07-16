package com.airline.invoices;

import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.pricing.PricingEngine;
import com.airline.security.TenantContext;
import com.airline.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
 * INV-07: Invoice Number Uniqueness
 * Verifies that invoice numbers are unique per supplier-airline pair.
 */
@ExtendWith(MockitoExtension.class)
public class InvoiceUniquenessTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private PricingEngine pricingEngine;

    @Mock
    private TenantContext tenantContext;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

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
    void testUniqueInvoiceNumberEnforced_INV_07() {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId("INV-100", "EK", "SWISSPORT"))
                .thenReturn(true);

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invoice number must be unique per airline-supplier pair");
    }

    @Test
    void testContractValidityDateValidation() {
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
                .issueDate(LocalDate.now().plusDays(20)) // Outside c-100 end date
                .dueDate(LocalDate.now().plusDays(50))
                .currency("AED")
                .lineItems(List.of(item))
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findById("c-100")).thenReturn(Optional.of(approvedContract));

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invoice issue date is outside the contract validity period");
    }
}
