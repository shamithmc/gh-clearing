package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class AirlineBilledAmountsResponse {
    List<CurrencySummary> summaries;
    List<GroupedAmount> bySupplier;
    List<GroupedAmount> byAirport;
    List<GroupedAmount> byService;
    List<InvoiceDrilldown> invoices;

    @Value
    @Builder
    public static class CurrencySummary {
        String currency;
        BigDecimal totalBilled;
        BigDecimal totalPaid;
        BigDecimal totalOutstanding;
        long invoiceCount;
    }

    @Value
    @Builder
    public static class GroupedAmount {
        String key;
        String currency;
        BigDecimal totalBilled;
        BigDecimal totalOutstanding;
        long invoiceCount;
    }

    @Value
    @Builder
    public static class InvoiceDrilldown {
        String id;
        String invoiceNumber;
        String supplierId;
        String airportCode;
        LocalDate issueDate;
        LocalDate dueDate;
        String status;
        String currency;
        BigDecimal invoiceTotal;
        BigDecimal filteredAmount;
        Set<String> serviceTypes;
    }
}
