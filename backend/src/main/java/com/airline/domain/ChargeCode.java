package com.airline.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "charge_codes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChargeCode {

    @Id
    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "description", nullable = false, length = 255)
    private String description;
}
