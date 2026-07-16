package com.airline.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mtow_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MtowRecord {

    @Id
    @Column(name = "tail_number", length = 20)
    private String tailNumber;

    @Column(name = "aircraft_type", nullable = false, length = 50)
    private String aircraftType;

    @Column(name = "weight", nullable = false, precision = 10, scale = 2)
    private BigDecimal weight;
}
