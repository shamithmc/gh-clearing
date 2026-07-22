package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ServiceOfferingCreateRequest {

    @NotBlank
    @Size(max = 3)
    private String airportCode;

    @NotBlank
    @Size(max = 50)
    private String serviceType;

    @NotBlank
    @Size(max = 2000)
    private String description;
}
