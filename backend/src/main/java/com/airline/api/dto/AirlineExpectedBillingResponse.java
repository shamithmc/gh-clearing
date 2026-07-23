package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Value
@Builder
public class AirlineExpectedBillingResponse {
    LocalDate startDate;
    LocalDate endDate;
    List<CurrencySummary> summaries;
    List<TimelinePoint> timeline;
    List<GroupedAmount> bySupplier;
    List<GroupedAmount> byAirport;
    List<GroupedAmount> byService;
    List<ProjectionDrilldown> projections;

    @Value
    @Builder
    public static class CurrencySummary {
        String currency;
        BigDecimal totalExpected;
        long occurrenceCount;
    }

    @Value
    @Builder
    public static class TimelinePoint {
        LocalDate date;
        String currency;
        BigDecimal amount;
        long occurrenceCount;
    }

    @Value
    @Builder
    public static class GroupedAmount {
        String key;
        String currency;
        BigDecimal totalExpected;
        long occurrenceCount;
    }

    @Value
    @Builder
    public static class ProjectionDrilldown {
        LocalDate expectedDate;
        String contractId;
        String serviceId;
        String supplierId;
        String airportCode;
        String serviceType;
        String serviceName;
        String billingFrequency;
        String currency;
        BigDecimal expectedAmount;
    }
}
