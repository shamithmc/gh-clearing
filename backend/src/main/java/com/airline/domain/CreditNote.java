package com.airline.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "credit_notes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditNote {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "credit_note_number", nullable = false, length = 64)
    private String creditNoteNumber;

    @Column(name = "dispute_id", nullable = false, unique = true, length = 36)
    private String disputeId;

    @Column(name = "invoice_id", nullable = false, length = 50)
    private String invoiceId;

    @Column(name = "original_invoice_number", nullable = false, length = 50)
    private String originalInvoiceNumber;

    @Column(name = "supplier_id", nullable = false, length = 50)
    private String supplierId;

    @Column(name = "airline_id", nullable = false, length = 50)
    private String airlineId;

    @Column(name = "airport_code", nullable = false, length = 10)
    private String airportCode;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CreditNoteStatus status;

    @Column(name = "xml_file_key", nullable = false, length = 255)
    private String xmlFileKey;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "dispatched_at")
    private OffsetDateTime dispatchedAt;

    @Column(name = "dispatch_error", columnDefinition = "TEXT")
    private String dispatchError;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
