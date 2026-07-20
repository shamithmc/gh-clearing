package com.airline.invoices;

import com.airline.domain.*;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.pricing.PricingEngine;
import com.airline.security.TenantContext;
import com.airline.service.InvoiceDispatchService;
import com.airline.service.InvoiceService;
import com.airline.service.FileStorageService;
import com.airline.xml.IsXmlGeneratorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InvoiceAuditLogTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private InvoiceAuditLogRepository invoiceAuditLogRepository;

    @Mock
    private PricingEngine pricingEngine;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @Mock
    private com.airline.service.DocumentGenerationJob documentGenerationJob;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private com.airline.security.DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @Mock
    private IsXmlGeneratorService xmlGeneratorService;

    @InjectMocks
    private InvoiceService invoiceService;

    private Contract approvedContract;
    private ServiceConfiguration passengersService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);

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
    void testAuditLogOnCreate() {
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
                .currency("AED")
                .lineItems(List.of(item))
                .build();

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("test-user");

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-100", "SWISSPORT")).thenReturn(Optional.of(approvedContract));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("1000.00"));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice result = invoiceService.createInvoice(invoice);

        ArgumentCaptor<InvoiceAuditLog> logCaptor = ArgumentCaptor.forClass(InvoiceAuditLog.class);
        verify(invoiceAuditLogRepository).save(logCaptor.capture());

        InvoiceAuditLog log = logCaptor.getValue();
        assertThat(log.getInvoiceId()).isEqualTo(result.getId());
        assertThat(log.getAction()).isEqualTo("CREATED");
        assertThat(log.getUserId()).isEqualTo("test-user");
        assertThat(log.getTimestamp()).isNotNull();
    }

    @Test
    void testAuditLogOnUpdate() {
        Invoice existing = Invoice.builder()
                .id("inv-uuid")
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.DRAFT)
                .lineItems(new ArrayList<>())
                .build();

        Invoice updated = Invoice.builder()
                .invoiceNumber("INV-101")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .currency("AED")
                .lineItems(new ArrayList<>())
                .build();

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("test-user-2");

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(invoiceRepository.findByIdAndTenantId("inv-uuid", "SWISSPORT")).thenReturn(Optional.of(existing));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        invoiceService.updateInvoice("inv-uuid", updated);

        ArgumentCaptor<InvoiceAuditLog> logCaptor = ArgumentCaptor.forClass(InvoiceAuditLog.class);
        verify(invoiceAuditLogRepository).save(logCaptor.capture());

        InvoiceAuditLog log = logCaptor.getValue();
        assertThat(log.getInvoiceId()).isEqualTo("inv-uuid");
        assertThat(log.getAction()).isEqualTo("UPDATED");
        assertThat(log.getUserId()).isEqualTo("test-user-2");
    }

    @Test
    void testAuditLogOnStatusChange() {
        Invoice existing = Invoice.builder()
                .id("inv-uuid-2")
                .invoiceNumber("INV-200")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .status(InvoiceStatus.APPROVED)
                .build();

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("test-user-3");

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(invoiceRepository.findByIdAndTenantId("inv-uuid-2", "SWISSPORT")).thenReturn(Optional.of(existing));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        invoiceService.updateInvoiceStatus("inv-uuid-2", InvoiceStatus.SENT);

        ArgumentCaptor<InvoiceAuditLog> logCaptor = ArgumentCaptor.forClass(InvoiceAuditLog.class);
        verify(invoiceAuditLogRepository).save(logCaptor.capture());

        InvoiceAuditLog log = logCaptor.getValue();
        assertThat(log.getInvoiceId()).isEqualTo("inv-uuid-2");
        assertThat(log.getAction()).isEqualTo("SENT");
        assertThat(log.getUserId()).isEqualTo("test-user-3");
    }
}
