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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "operational_flights")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationalFlight {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String supplierId;

    @Column(name = "airline_id", nullable = false, length = 50)
    private String airlineId;

    @Column(name = "airport_code", nullable = false, length = 3)
    private String airportCode;

    @Column(name = "flight_number", nullable = false, length = 10)
    private String flightNumber;

    @Column(name = "flight_date", nullable = false)
    private LocalDate flightDate;

    @Column(name = "tail_id", nullable = false, length = 20)
    private String tailId;

    @Column(name = "aircraft_type", length = 50)
    private String aircraftType;

    @Column(name = "departure_airport", nullable = false, length = 3)
    private String departureAirport;

    @Column(name = "destination_airport", nullable = false, length = 3)
    private String destinationAirport;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "quantity_drivers", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> quantityDrivers;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
