package com.airline.service;

import com.airline.domain.CreditNote;
import com.airline.notification.NotificationRecipientResolver;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Set;

@Service
public class CreditNoteDispatchService {
    private final JavaMailSender mailSender;
    private final NotificationRecipientResolver recipientResolver;

    @Value("${app.mail.from:noreply@ghcp.internal}")
    private String fromAddress;

    @Value("${app.mail.dispatch-enabled:true}")
    private boolean dispatchEnabled;

    public CreditNoteDispatchService(JavaMailSender mailSender, NotificationRecipientResolver recipientResolver) {
        this.mailSender = mailSender;
        this.recipientResolver = recipientResolver;
    }

    /** @return true only when at least one authorized recipient was successfully sent the document. */
    public boolean dispatch(CreditNote note, byte[] xml) {
        if (!dispatchEnabled) {
            return false;
        }
        List<String> recipients = recipientResolver.resolve(
                note.getAirlineId(),
                Set.of("INVOICE_REVIEWER"),
                note.getAirportCode(),
                note.getAirlineId(),
                Set.of());
        if (recipients.isEmpty()) {
            throw new IllegalStateException("No authorized airline credit-note recipients were found");
        }

        for (String recipient : recipients) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromAddress);
                helper.setTo(recipient);
                helper.setSubject("Credit note " + note.getCreditNoteNumber()
                        + " for invoice " + note.getOriginalInvoiceNumber());
                helper.setText("A credit note for " + note.getAmount() + " " + note.getCurrency()
                        + " has been issued against invoice " + note.getOriginalInvoiceNumber() + ".", false);
                helper.addAttachment(
                        "credit-note-" + note.getCreditNoteNumber() + ".xml",
                        () -> new ByteArrayInputStream(xml),
                        "application/xml");
                mailSender.send(message);
            } catch (Exception exception) {
                throw new IllegalStateException("Credit-note dispatch failed for " + recipient, exception);
            }
        }
        return true;
    }
}
