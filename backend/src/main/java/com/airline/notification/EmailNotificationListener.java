package com.airline.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Set;

@Service
public class EmailNotificationListener {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationListener.class);
    private static final Set<String> CONTRACT_NOTIFICATION_ROLES =
            Set.of("CONTRACT_ENTRY", "CONTRACT_APPROVER");
    private static final Set<String> PAYMENT_NOTIFICATION_ROLES =
            Set.of("STATUS_UPDATER", "INVOICE_ENTRY", "INVOICE_APPROVER");

    private final JavaMailSender mailSender;
    private final NotificationRecipientResolver recipientResolver;

    @Value("${app.mail.from:noreply@ghcp.internal}")
    private String fromAddress;

    @Value("${app.mail.notifications-enabled:true}")
    private boolean notificationsEnabled;

    public EmailNotificationListener(
            JavaMailSender mailSender, NotificationRecipientResolver recipientResolver) {
        this.mailSender = mailSender;
        this.recipientResolver = recipientResolver;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onContractReviewRequested(ContractReviewRequestedEvent event) {
        String subject = "Contract review requested: " + event.contractId();
        String body = "Airline %s requested a review of contract %s at %s.%n%nComment: %s"
                .formatted(event.airlineId(), event.contractId(), event.airportCode(), event.comment());
        sendToScopedUsers(event.groundHandlerId(), CONTRACT_NOTIFICATION_ROLES,
                event.airportCode(), event.airlineId(), event.chargeCodes(), subject, body);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPaymentMarked(PaymentMarkedEvent event) {
        String subject = "Invoice marked paid: " + event.invoiceNumber();
        String body = "Airline %s marked invoice %s as paid.%n%nAmount: %s %s%nAirport: %s"
                .formatted(event.airlineId(), event.invoiceNumber(), event.totalAmount(),
                        event.currency(), event.airportCode());
        sendToScopedUsers(event.groundHandlerId(), PAYMENT_NOTIFICATION_ROLES,
                event.airportCode(), event.airlineId(), event.chargeCodes(), subject, body);
    }

    private void sendToScopedUsers(
            String tenantId,
            Set<String> requiredRoles,
            String airportCode,
            String airlineId,
            Set<String> chargeCodes,
            String subject,
            String body) {
        if (!notificationsEnabled) {
            return;
        }

        recipientResolver.resolve(tenantId, requiredRoles, airportCode, airlineId, chargeCodes).stream()
                .forEach(email -> send(email, subject, body));
    }

    private void send(String email, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(email);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (RuntimeException exception) {
            logger.warn("Workflow email notification to {} skipped (SMTP server unavailable at localhost:1025): {}", email, exception.getMessage());
            logger.debug("Full workflow notification exception: ", exception);
        }
    }
}
