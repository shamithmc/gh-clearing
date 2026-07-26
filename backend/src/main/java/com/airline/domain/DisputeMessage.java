package com.airline.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "dispute_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeMessage {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    @JsonIgnore
    private Dispute dispute;

    @Column(name = "sender_tenant_id", nullable = false)
    private String senderTenantId;

    @Column(name = "sender_tenant_type", nullable = false)
    private String senderTenantType;

    @Column(name = "sender_user_id", nullable = false)
    private String senderUserId;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "action")
    private String action;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }
    }
}
