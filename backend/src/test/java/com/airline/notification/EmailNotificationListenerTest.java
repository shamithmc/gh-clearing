package com.airline.notification;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailNotificationListenerTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private NotificationRecipientResolver recipientResolver;

    private EmailNotificationListener listener;

    @BeforeEach
    void setUp() {
        listener = new EmailNotificationListener(mailSender, recipientResolver);
        ReflectionTestUtils.setField(listener, "fromAddress", "noreply@ghcp.test");
        ReflectionTestUtils.setField(listener, "notificationsEnabled", true);
    }

    @Test
    void reviewRequestSendsResolvedNotification() {
        when(recipientResolver.resolve(
                "SWISSPORT", Set.of("CONTRACT_ENTRY", "CONTRACT_APPROVER"),
                "DXB", "EK", Set.of("BAGGAGE")))
                .thenReturn(List.of("permitted@gh.test"));

        listener.onContractReviewRequested(new ContractReviewRequestedEvent(
                "contract-1", "SWISSPORT", "EK", "DXB", Set.of("BAGGAGE"),
                "Please review the rate."));

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getTo()).containsExactly("permitted@gh.test");
        assertThat(messageCaptor.getValue().getSubject()).contains("contract-1");
        assertThat(messageCaptor.getValue().getText()).contains("Please review the rate.");
    }

    @Test
    void paymentMarkedNotifiesScopedInvoiceOperators() {
        when(recipientResolver.resolve(
                "SWISSPORT", Set.of("STATUS_UPDATER", "INVOICE_ENTRY", "INVOICE_APPROVER"),
                "DXB", "EK", Set.of("BAGGAGE")))
                .thenReturn(List.of("status@gh.test"));

        listener.onPaymentMarked(new PaymentMarkedEvent(
                "invoice-1", "INV-100", "SWISSPORT", "EK", "DXB", Set.of("BAGGAGE"),
                new BigDecimal("125.50"), "AED"));

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getTo()).containsExactly("status@gh.test");
        assertThat(messageCaptor.getValue().getSubject()).contains("INV-100");
        assertThat(messageCaptor.getValue().getText()).contains("125.50 AED");
    }

    @Test
    void disabledNotificationsDoNotReadRecipientsOrSendMail() {
        ReflectionTestUtils.setField(listener, "notificationsEnabled", false);

        listener.onPaymentMarked(new PaymentMarkedEvent(
                "invoice-1", "INV-100", "SWISSPORT", "EK", "DXB", Set.of(),
                BigDecimal.ONE, "AED"));

        verify(recipientResolver, never()).resolve(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anySet(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anySet());
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.any(SimpleMailMessage.class));
    }
}
