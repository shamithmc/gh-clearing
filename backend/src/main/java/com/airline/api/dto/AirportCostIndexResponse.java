package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class AirportCostIndexResponse {
    String airportCode;
    String airportName;
    String region;
    String serviceType;
    String serviceName;
    String aircraftType;
    String operationType;
    String currency;
    BigDecimal averageCost;
    long observationCount;
}
