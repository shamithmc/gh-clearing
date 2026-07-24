package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class SupplierOperationalFootprintResponse {
    LocalDate asOfDate;
    Summary summary;
    List<AirportOperation> airports;
    List<ContractOperation> contracts;

    @Value
    @Builder
    public static class Summary {
        long airportCount;
        long airlineCount;
        long serviceCount;
        long activeContractCount;
    }

    @Value
    @Builder
    public static class AirportOperation {
        String airportCode;
        String airportName;
        String city;
        String country;
        String region;
        BigDecimal latitude;
        BigDecimal longitude;
        Set<String> airlines;
        Set<String> serviceTypes;
        List<CurrencyValue> monthlyValues;
        long contractCount;
    }

    @Value
    @Builder
    public static class CurrencyValue {
        String currency;
        BigDecimal monthlyExpectedValue;
    }

    @Value
    @Builder
    public static class ContractOperation {
        String contractId;
        String airlineId;
        String airportCode;
        LocalDate startDate;
        LocalDate endDate;
        String currency;
        List<ServiceOperation> services;
    }

    @Value
    @Builder
    public static class ServiceOperation {
        String serviceId;
        String serviceType;
        String serviceName;
        String billingFrequency;
        BigDecimal monthlyExpectedValue;
    }
}
