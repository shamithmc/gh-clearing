package com.airline.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "airlines")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Airline {

    @Id
    @Column(name = "iata_code", length = 2)
    private String iataCode;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "country", nullable = false, length = 100)
    private String country;
}
