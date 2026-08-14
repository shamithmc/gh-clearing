package com.airline.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoice_line_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "invoice")
@EqualsAndHashCode(exclude = "invoice")
public class InvoiceLineItem {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Invoice invoice;

    @Column(name = "flight_date", nullable = false)
    private LocalDate flightDate;

    @Column(name = "flight_number", nullable = false, length = 20)
    private String flightNumber;

    @Column(name = "aircraft_reg", nullable = false, length = 20)
    private String aircraftReg;

    @Column(name = "aircraft_type", length = 50)
    private String aircraftType;

    @Column(name = "origin", nullable = false, length = 3)
    private String origin;

    @Column(name = "destination", nullable = false, length = 3)
    private String destination;

    @Column(name = "charge_code", nullable = false, length = 50)
    private String chargeCode;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Column(name = "formula_type", nullable = false, length = 10)
    private String formulaType;

    @Column(name = "quantity_drivers", nullable = false, length = 500)
    private String quantityDrivers;

    @Column(name = "calculated_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal calculatedAmount;

    @Column(name = "contract_id", length = 50)
    private String contractId;

    @Column(name = "operational_flight_id", length = 50)
    private String operationalFlightId;

    @Column(name = "disputed")
    private Boolean disputed = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispute_category", length = 50)
    private DisputeCategory disputeCategory;

    @Column(name = "dispute_comment", length = 500)
    private String disputeComment;
}
