package com.airline.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "invoice_audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceAuditLog {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "invoice_id", nullable = false, length = 50)
    private String invoiceId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "comments", length = 1000)
    private String comments;

    @Column(name = "timestamp", nullable = false)
    private OffsetDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = OffsetDateTime.now();
        }
    }
}
