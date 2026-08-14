package com.airline.invoices;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceAuditLog;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.DocumentGenerationJob;
import com.airline.service.InvoiceService;
import com.airline.notification.PaymentMarkedEvent;
import com.airline.xml.IsXmlGeneratorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirlinePaymentStatusTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private com.airline.pricing.PricingEngine pricingEngine;
    @Mock private TenantContext tenantContext;
    @Mock private InvoiceAuditLogRepository invoiceAuditLogRepository;
    @Mock private DocumentGenerationJob documentGenerationJob;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock private IsXmlGeneratorService isXmlGeneratorService;
    @Mock private ApplicationEventPublisher applicationEventPublisher;

    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(invoiceRepository, contractRepository, pricingEngine,
                tenantContext, new ObjectMapper(), invoiceAuditLogRepository, documentGenerationJob,
                dimensionalSecurityEvaluator, applicationEventPublisher, null);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("payment-user", "n/a", "PAYMENT_UPDATER"));
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void airlinePaymentUpdaterMarksSentInvoicePaidAndAuditsTransition() {
        Invoice invoice = invoice(InvoiceStatus.SENT);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "EK")).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        Invoice result = invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID);

        assertThat(result.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(result.getInvoiceNumber()).isEqualTo("INV-100");
        assertThat(result.getTotalAmount()).isEqualByComparingTo("125.50");
        verify(invoiceRepository).save(invoice);

        ArgumentCaptor<InvoiceAuditLog> auditCaptor = ArgumentCaptor.forClass(InvoiceAuditLog.class);
        verify(invoiceAuditLogRepository).save(auditCaptor.capture());
        assertThat(auditCaptor.getValue().getAction()).isEqualTo("PAID");
        assertThat(auditCaptor.getValue().getUserId()).isEqualTo("payment-user");
        ArgumentCaptor<PaymentMarkedEvent> eventCaptor =
                ArgumentCaptor.forClass(PaymentMarkedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().groundHandlerId()).isEqualTo("SWISSPORT");
        assertThat(eventCaptor.getValue().invoiceNumber()).isEqualTo("INV-100");
    }

    @Test
    void disputedInvoiceCanAlsoBeMarkedPaid() {
        Invoice invoice = invoice(InvoiceStatus.DISPUTED);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "EK")).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        assertThat(invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID).getStatus())
                .isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void invoiceReviewerWithoutPaymentRoleIsDeniedBeforeRead() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("reviewer", "n/a", "INVOICE_REVIEWER"));

        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("PAYMENT_UPDATER");
        verify(invoiceRepository, never()).findByIdAndTenantId(any(), any());
    }

    @Test
    void airlineCannotUseStatusEndpointForAnotherTransition() {
        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.DISPUTED))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only mark invoices as PAID");
        verify(invoiceRepository, never()).findByIdAndTenantId(any(), any());
    }

    @Test
    void preDispatchInvoiceCannotBeMarkedPaid() {
        Invoice invoice = invoice(InvoiceStatus.APPROVED);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "EK")).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Invoice not found");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void crossTenantPaymentFailsClosed() {
        when(tenantContext.getCurrentTenantId()).thenReturn("QR");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "QR")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Invoice not found");
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void dimensionalDenialPreventsPayment() {
        Invoice invoice = invoice(InvoiceStatus.SENT);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.findByIdAndTenantId("invoice-1", "EK")).thenReturn(Optional.of(invoice));
        org.mockito.Mockito.doThrow(new AccessDeniedException("Charge code access denied"))
                .when(dimensionalSecurityEvaluator)
                .verifyAccess("DXB", "EK", java.util.Set.of("BAGGAGE"));

        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus("invoice-1", InvoiceStatus.PAID))
                .isInstanceOf(AccessDeniedException.class);
        verify(invoiceRepository, never()).save(any());
    }

    private Invoice invoice(InvoiceStatus status) {
        return Invoice.builder()
                .id("invoice-1")
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(status)
                .totalAmount(new BigDecimal("125.50"))
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode("BAGGAGE").build()))
                .build();
    }
}
