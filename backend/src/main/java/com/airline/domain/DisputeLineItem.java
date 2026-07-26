package com.airline.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "dispute_line_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeLineItem {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    @JsonIgnore
    private Dispute dispute;

    @Column(name = "line_item_id", nullable = false)
    private String lineItemId;

    @Column(name = "charge_code", nullable = false)
    private String chargeCode;

    @Column(name = "disputed_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal disputedAmount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
