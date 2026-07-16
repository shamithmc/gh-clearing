package com.airline.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "supplier_configurations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierConfiguration {

    @Id
    @Column(name = "tenant_id", length = 50)
    private String tenantId;

    @Column(name = "email_ids", length = 255)
    private String emailIds;

    @Column(name = "invoice_backdating_days", nullable = false)
    @Builder.Default
    private Integer invoiceBackdatingDays = 30;

    @Column(name = "regional_classification", length = 50)
    private String regionalClassification;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "supplier_enabled_airlines", joinColumns = @JoinColumn(name = "tenant_id"))
    @Column(name = "airline_id")
    @Builder.Default
    private Set<String> enabledAirlines = new HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "supplier_enabled_airports", joinColumns = @JoinColumn(name = "tenant_id"))
    @Column(name = "airport_code")
    @Builder.Default
    private Set<String> enabledAirports = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
