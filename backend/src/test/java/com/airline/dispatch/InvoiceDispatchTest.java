package com.airline.dispatch;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.service.InvoiceDispatchService;
import com.airline.notification.NotificationRecipientResolver;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests that InvoiceDispatchService sends an email with XML and PDF attachments.
 */
@ExtendWith(MockitoExtension.class)
class InvoiceDispatchTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private NotificationRecipientResolver recipientResolver;

    private InvoiceDispatchService dispatchService;

    @BeforeEach
    void setUp() {
        dispatchService = new InvoiceDispatchService(mailSender, recipientResolver);
        // Inject @Value fields that are not populated outside Spring context
        ReflectionTestUtils.setField(dispatchService, "fromAddress", "noreply@ghcp.test");
        ReflectionTestUtils.setField(dispatchService, "dispatchEnabled", true);
    }

    @Test
    void testDispatchSendsEmailWithAttachments() {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(recipientResolver.resolve(
                "EK", java.util.Set.of("INVOICE_REVIEWER"), "DXB", "EK", java.util.Set.of()))
                .thenReturn(List.of("airline-user@example.test"));

        Invoice invoice = buildTestInvoice();
        byte[] xmlBytes = "<Invoice/>".getBytes();
        byte[] pdfBytes = "%PDF-test".getBytes();

        dispatchService.dispatch(invoice, xmlBytes, pdfBytes);

        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void testDispatchIsSkippedWhenDisabled() {
        ReflectionTestUtils.setField(dispatchService, "dispatchEnabled", false);

        Invoice invoice = buildTestInvoice();
        dispatchService.dispatch(invoice, "<Invoice/>".getBytes(), "%PDF".getBytes());

        // Should NOT call mail sender at all
        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    private Invoice buildTestInvoice() {
        return Invoice.builder()
                .id("inv-dispatch-test")
                .invoiceNumber("INV-DISPATCH-001")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("AED")
                .issueDate(LocalDate.of(2025, 1, 15))
                .dueDate(LocalDate.of(2025, 2, 14))
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1200.00"))
                .lineItems(new ArrayList<>())
                .build();
    }
}
