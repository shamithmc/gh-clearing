package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class AirlineContractExpiryResponse {
    LocalDate asOfDate;
    int horizonDays;
    Summary summary;
    List<AirportExpiryPoint> airports;
    List<ExpiringContract> contracts;

    @Value
    @Builder
    public static class Summary {
        long totalContracts;
        long expiringWithin30Days;
        long expiringWithin60Days;
        long expiringAfter60Days;
        long airportCount;
    }

    @Value
    @Builder
    public static class AirportExpiryPoint {
        String airportCode;
        String airportName;
        String city;
        String country;
        String region;
        BigDecimal latitude;
        BigDecimal longitude;
        long contractCount;
        long nearestExpiryDays;
        Set<String> suppliers;
        Set<String> serviceTypes;
    }

    @Value
    @Builder
    public static class ExpiringContract {
        String contractId;
        String supplierId;
        String airportCode;
        String airportName;
        LocalDate startDate;
        LocalDate endDate;
        long daysRemaining;
        String urgency;
        String currency;
        Set<String> serviceTypes;
    }
}
