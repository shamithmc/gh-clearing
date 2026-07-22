package com.airline.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "rfp_proposals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RfpProposal {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "rfp_id", nullable = false, length = 50)
    private String rfpId;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "proposed_rate", nullable = false, precision = 19, scale = 4)
    private BigDecimal proposedRate;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, length = 4000)
    private String terms;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RfpProposalStatus status;

    @Column(name = "submitted_by", nullable = false, length = 100)
    private String submittedBy;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private OffsetDateTime submittedAt;

    @Column(name = "decided_by", length = 100)
    private String decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = OffsetDateTime.now();
        }
    }
}
