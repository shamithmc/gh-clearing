package com.airline.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "disputes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dispute {

    @Id
    private String id;

    @Column(name = "dispute_number", nullable = false, unique = true)
    private String disputeNumber;

    @Column(name = "invoice_id", nullable = false)
    private String invoiceId;

    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @Column(name = "airline_id", nullable = false)
    private String airlineId;

    @Column(name = "supplier_id", nullable = false)
    private String supplierId;

    @Column(name = "airport_code", nullable = false)
    private String airportCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DisputeStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private DisputeCategory category;

    @Column(name = "disputed_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal disputedAmount;

    @Column(name = "credit_note_amount", precision = 15, scale = 2)
    private BigDecimal creditNoteAmount;

    @Column(name = "initiator_comment", columnDefinition = "TEXT")
    private String initiatorComment;

    @Column(name = "latest_response", columnDefinition = "TEXT")
    private String latestResponse;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DisputeLineItem> lineItems = new ArrayList<>();

    @OneToMany(mappedBy = "dispute", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DisputeMessage> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = ZonedDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
