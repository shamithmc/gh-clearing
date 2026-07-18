package com.airline.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DashboardDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceivablesSummary {
        private BigDecimal totalOutstanding;
        private List<GroupedReceivable> byAirline;
        private List<GroupedReceivable> byAirport;
        private AgingBuckets aging;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupedReceivable {
        private String key;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgingBuckets {
        private BigDecimal zeroToThirty;
        private BigDecimal thirtyOneToSixty;
        private BigDecimal sixtyOneToNinety;
        private BigDecimal ninetyPlus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoicedTrend {
        private String month;
        private BigDecimal totalAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenuePerFlightTrend {
        private String month;
        private BigDecimal averageRevenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpiringContract {
        private String id;
        private String airlineId;
        private String airportCode;
        private LocalDate endDate;
        private long daysRemaining;
    }
}
