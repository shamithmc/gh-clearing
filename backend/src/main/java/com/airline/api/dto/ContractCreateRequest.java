package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ContractCreateRequest {

    @NotBlank
    private String airlineId;

    @NotBlank
    private String airportCode;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotBlank
    private String currency;

    @NotEmpty
    private List<ServiceConfigurationDTO> services;
}
