package com.airline.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "aircraft_type_mtow_defaults")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AircraftTypeMtowDefault {

    @Id
    @Column(name = "aircraft_type", length = 50)
    private String aircraftType;

    @Column(name = "weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal weight;
}
