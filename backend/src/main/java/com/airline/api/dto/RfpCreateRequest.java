package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RfpCreateRequest {

    @NotBlank
    @Size(max = 3)
    private String airportCode;

    @NotBlank
    @Size(max = 50)
    private String serviceType;

    @NotBlank
    @Size(max = 4000)
    private String requirements;

    @NotNull
    private LocalDate desiredStartDate;

    @NotNull
    private LocalDate desiredEndDate;
}
