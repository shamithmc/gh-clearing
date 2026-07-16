package com.airline.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "services")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceConfiguration {

    @Id
    @Column(length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    @ToString.Exclude
    private Contract contract;

    @Column(name = "charge_code", nullable = false, length = 50)
    private String chargeCode;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "formula_type", nullable = false, length = 10)
    private FormulaType formulaType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rate_details", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> rateDetails;

    @Column(name = "quantity_driver", nullable = false, length = 50)
    private String quantityDriver;

    @Column(name = "uom", nullable = false, length = 20)
    private String uom;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
