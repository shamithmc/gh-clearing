package com.airline.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "contract_review_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractReviewRequest {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "contract_id", nullable = false, length = 50)
    private String contractId;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String groundHandlerId;

    @Column(name = "airline_id", nullable = false, length = 50)
    private String airlineId;

    @Column(nullable = false, length = 2000)
    private String comment;

    @Column(name = "requested_by", nullable = false, length = 100)
    private String requestedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
