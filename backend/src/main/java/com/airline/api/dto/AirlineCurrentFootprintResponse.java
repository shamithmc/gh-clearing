package com.airline.api.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class AirlineCurrentFootprintResponse {
    LocalDate asOfDate;
    LocalDate invoicedFromDate;
    Summary summary;
    List<AirportFootprint> airports;
    List<ContractDrilldown> contracts;
    List<InvoiceSummary> invoices;

    @Value
    @Builder
    public static class Summary {
        long airportCount;
        long supplierCount;
        long serviceCount;
        long activeContractCount;
        long dispatchedInvoiceCount;
    }

    @Value
    @Builder
    public static class AirportFootprint {
        String airportCode;
        String airportName;
        String city;
        String country;
        String region;
        BigDecimal latitude;
        BigDecimal longitude;
        Set<String> suppliers;
        Set<String> serviceTypes;
        List<CurrencyMetric> financials;
    }

    @Value
    @Builder
    public static class CurrencyMetric {
        String currency;
        BigDecimal monthlyContractValue;
        BigDecimal invoicedValue;
        long invoiceCount;
    }

    @Value
    @Builder
    public static class ContractDrilldown {
        String contractId;
        String supplierId;
        String airportCode;
        LocalDate startDate;
        LocalDate endDate;
        String currency;
        List<ServiceRate> services;
    }

    @Value
    @Builder
    public static class ServiceRate {
        String serviceId;
        String serviceType;
        String serviceName;
        String billingFrequency;
        BigDecimal monthlyExpectedValue;
    }

    @Value
    @Builder
    public static class InvoiceSummary {
        String invoiceId;
        String invoiceNumber;
        String supplierId;
        String airportCode;
        LocalDate issueDate;
        String status;
        String currency;
        BigDecimal invoicedValue;
        Set<String> serviceTypes;
    }
}
