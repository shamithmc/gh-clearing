package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Value
@Builder
public class PendingInvoicingResponse {
    LocalDate startDate;
    LocalDate endDate;
    LocalDate asOfDate;
    List<CurrencySummary> summaries;
    List<GroupedAmount> byAirline;
    List<GroupedAmount> byAirport;
    List<PendingItem> items;

    @Value @Builder
    public static class CurrencySummary {
        String currency;
        BigDecimal totalPending;
        long itemCount;
    }

    @Value @Builder
    public static class GroupedAmount {
        String key;
        String currency;
        BigDecimal totalPending;
        long itemCount;
    }

    @Value @Builder
    public static class PendingItem {
        String operationalFlightId;
        String flightNumber;
        LocalDate flightDate;
        LocalDate billingDueDate;
        String contractId;
        String airlineId;
        String airportCode;
        String serviceType;
        String serviceName;
        String billingFrequency;
        String currency;
        BigDecimal pendingAmount;
    }
}
