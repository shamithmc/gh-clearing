package com.airline.security;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.pricing.PricingEngine;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.service.DocumentGenerationJob;
import com.airline.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * INV-01: proves invoice reads and writes are scoped in the repository query
 * and never load a record belonging to an unrelated tenant.
 */
@ExtendWith(MockitoExtension.class)
class TenantIsolationTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private PricingEngine pricingEngine;
    @Mock private TenantContext tenantContext;
    @Mock private ObjectMapper objectMapper;
    @Mock private InvoiceAuditLogRepository invoiceAuditLogRepository;
    @Mock private DocumentGenerationJob documentGenerationJob;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock private com.airline.xml.IsXmlGeneratorService isXmlGeneratorService;

    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(
                invoiceRepository,
                contractRepository,
                pricingEngine,
                tenantContext,
                objectMapper,
                invoiceAuditLogRepository,
                documentGenerationJob,
                dimensionalSecurityEvaluator,
                isXmlGeneratorService);
    }

    @Test
    void tenantScopedReadUsesTenantPredicate() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .supplierId("GH-1")
                .airlineId("EK")
                .status(InvoiceStatus.DRAFT)
                .build();
        when(tenantContext.getCurrentTenantId()).thenReturn("GH-1");
        when(invoiceRepository.findByIdAndTenantId("inv-1", "GH-1"))
                .thenReturn(Optional.of(invoice));

        assertThat(invoiceService.getInvoice("inv-1")).isSameAs(invoice);
        verify(invoiceRepository).findByIdAndTenantId("inv-1", "GH-1");
        verify(invoiceRepository, never()).findById(anyString());
    }

    @Test
    void crossTenantReadFailsClosedWithoutLoadingGlobalRecord() {
        when(tenantContext.getCurrentTenantId()).thenReturn("GH-2");
        when(invoiceRepository.findByIdAndTenantId("inv-1", "GH-2"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.getInvoice("inv-1"))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Invoice not found");
        verify(invoiceRepository, never()).findById(anyString());
    }

    @Test
    void crossTenantWriteFailsBeforeSaving() {
        when(tenantContext.getCurrentTenantId()).thenReturn("GH-2");
        when(invoiceRepository.findByIdAndTenantId("inv-1", "GH-2"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.updateInvoice("inv-1", Invoice.builder().build()))
                .isInstanceOf(java.util.NoSuchElementException.class);
        verify(invoiceRepository, never()).save(any());
        verify(invoiceRepository, never()).findById(anyString());
    }

    @Test
    void tenantCannotCreateInvoiceForAnotherSupplier() {
        Invoice invoice = Invoice.builder()
                .supplierId("GH-2")
                .airlineId("EK")
                .build();
        when(tenantContext.getCurrentTenantId()).thenReturn("GH-1");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("different supplier");
        verify(invoiceRepository, never()).save(any());
    }
}
