package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

@Data
public class OperationalFlightRequest {
    @NotBlank @Size(max = 50)
    private String id;
    @NotBlank @Size(max = 50)
    private String airlineId;
    @NotBlank @Size(max = 3)
    private String airportCode;
    @NotBlank @Size(max = 10)
    private String flightNumber;
    @NotNull
    private LocalDate flightDate;
    @NotBlank @Size(max = 20)
    private String tailId;
    @Size(max = 50)
    private String aircraftType;
    @NotBlank @Size(max = 3)
    private String departureAirport;
    @NotBlank @Size(max = 3)
    private String destinationAirport;
    @NotEmpty
    private Map<String, Object> quantityDrivers;
}
