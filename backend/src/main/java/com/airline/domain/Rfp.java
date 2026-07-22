package com.airline.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "rfps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rfp {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "airline_id", nullable = false, length = 50)
    private String airlineId;

    @Column(name = "airport_code", nullable = false, length = 3)
    private String airportCode;

    @Column(name = "service_type", nullable = false, length = 50)
    private String serviceType;

    @Column(nullable = false, length = 4000)
    private String requirements;

    @Column(name = "desired_start_date", nullable = false)
    private LocalDate desiredStartDate;

    @Column(name = "desired_end_date", nullable = false)
    private LocalDate desiredEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RfpStatus status;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rfp_eligible_ground_handlers", joinColumns = @JoinColumn(name = "rfp_id"))
    @Column(name = "ground_handler_id", length = 50)
    @Builder.Default
    private Set<String> eligibleGroundHandlerIds = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
