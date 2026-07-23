package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class PricingBenchmarkResponse {
    String airportCode;
    String airportName;
    String region;
    String serviceType;
    String serviceName;
    String aircraftType;
    String operationType;
    String currency;
    BigDecimal airlineAverageCost;
    long airlineObservationCount;
    String marketPosition;
}
