package com.airline.service;

import com.airline.api.dto.AirlineBilledAmountsResponse;
import com.airline.api.dto.AirlineBilledAmountsResponse.CurrencySummary;
import com.airline.api.dto.AirlineBilledAmountsResponse.GroupedAmount;
import com.airline.api.dto.AirlineBilledAmountsResponse.InvoiceDrilldown;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AirlineFinancialService {

    private static final Set<InvoiceStatus> BILLED_STATUSES =
            Set.of(InvoiceStatus.SENT, InvoiceStatus.DISPUTED, InvoiceStatus.PAID);

    private final InvoiceRepository invoiceRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirlineFinancialService(
            InvoiceRepository invoiceRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.invoiceRepository = invoiceRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public AirlineBilledAmountsResponse getBilledAmounts(
            String supplierId,
            String airportCode,
            String serviceType,
            LocalDate startDate,
            LocalDate endDate) {
        String airlineId = requireAirlineMisViewer();
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must not be after end date");
        }
        if (!dimensionalSecurityEvaluator.isAirlinePermitted(airlineId)) {
            return emptyResponse();
        }

        String supplierFilter = normalize(supplierId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        Map<String, SummaryAccumulator> summaries = new HashMap<>();
        Map<GroupKey, GroupAccumulator> suppliers = new HashMap<>();
        Map<GroupKey, GroupAccumulator> airports = new HashMap<>();
        Map<GroupKey, GroupAccumulator> services = new HashMap<>();
        List<InvoiceDrilldown> drilldowns = new ArrayList<>();

        invoiceRepository.findAllByTenantId(airlineId).stream()
                .filter(invoice -> airlineId.equals(invoice.getAirlineId()))
                .filter(invoice -> BILLED_STATUSES.contains(invoice.getStatus()))
                .filter(invoice -> matches(invoice.getSupplierId(), supplierFilter))
                .filter(invoice -> matches(invoice.getAirportCode(), airportFilter))
                .filter(invoice -> startDate == null || !invoice.getIssueDate().isBefore(startDate))
                .filter(invoice -> endDate == null || !invoice.getIssueDate().isAfter(endDate))
                .filter(this::isDimensionallyPermitted)
                .forEach(invoice -> aggregateInvoice(
                        invoice, serviceFilter, summaries, suppliers, airports, services, drilldowns));

        return AirlineBilledAmountsResponse.builder()
                .summaries(toSummaries(summaries))
                .bySupplier(toGroups(suppliers))
                .byAirport(toGroups(airports))
                .byService(toGroups(services))
                .invoices(drilldowns.stream()
                        .sorted(Comparator.comparing(InvoiceDrilldown::getIssueDate).reversed()
                                .thenComparing(InvoiceDrilldown::getInvoiceNumber))
                        .toList())
                .build();
    }

    private void aggregateInvoice(
            Invoice invoice,
            String serviceFilter,
            Map<String, SummaryAccumulator> summaries,
            Map<GroupKey, GroupAccumulator> suppliers,
            Map<GroupKey, GroupAccumulator> airports,
            Map<GroupKey, GroupAccumulator> services,
            List<InvoiceDrilldown> drilldowns) {
        List<InvoiceLineItem> matchingLines = invoice.getLineItems() == null
                ? List.of()
                : invoice.getLineItems().stream()
                        .filter(item -> matches(item.getChargeCode(), serviceFilter))
                        .filter(item -> item.getCalculatedAmount() != null)
                        .toList();
        if (serviceFilter != null && matchingLines.isEmpty()) {
            return;
        }

        BigDecimal billedAmount = serviceFilter == null
                ? invoice.getTotalAmount()
                : matchingLines.stream()
                        .map(InvoiceLineItem::getCalculatedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (billedAmount == null) {
            billedAmount = BigDecimal.ZERO;
        }
        BigDecimal outstandingAmount = outstandingPortion(invoice, billedAmount);
        boolean paid = invoice.getStatus() == InvoiceStatus.PAID;
        String currency = invoice.getCurrency();

        summaries.computeIfAbsent(currency, ignored -> new SummaryAccumulator())
                .add(billedAmount, paid ? billedAmount : BigDecimal.ZERO, outstandingAmount);
        suppliers.computeIfAbsent(
                        new GroupKey(invoice.getSupplierId(), currency), ignored -> new GroupAccumulator())
                .add(billedAmount, outstandingAmount);
        airports.computeIfAbsent(
                        new GroupKey(invoice.getAirportCode(), currency), ignored -> new GroupAccumulator())
                .add(billedAmount, outstandingAmount);
        for (InvoiceLineItem item : matchingLines) {
            BigDecimal lineOutstanding = outstandingPortion(invoice, item.getCalculatedAmount());
            services.computeIfAbsent(
                            new GroupKey(item.getChargeCode(), currency), ignored -> new GroupAccumulator())
                    .add(item.getCalculatedAmount(), lineOutstanding);
        }

        drilldowns.add(InvoiceDrilldown.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .supplierId(invoice.getSupplierId())
                .airportCode(invoice.getAirportCode())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .status(invoice.getStatus().name())
                .currency(currency)
                .invoiceTotal(scale(invoice.getTotalAmount()))
                .filteredAmount(scale(billedAmount))
                .serviceTypes(matchingLines.stream()
                        .map(InvoiceLineItem::getChargeCode)
                        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)))
                .build());
    }

    private BigDecimal outstandingPortion(Invoice invoice, BigDecimal amount) {
        if (invoice.getStatus() == InvoiceStatus.PAID || amount == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal invoiceTotal = invoice.getTotalAmount();
        if (invoiceTotal == null || invoiceTotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal credit = invoice.getCreditNoteAmount() == null
                ? BigDecimal.ZERO
                : invoice.getCreditNoteAmount().min(invoiceTotal);
        BigDecimal outstandingRatio = invoiceTotal.subtract(credit)
                .divide(invoiceTotal, 8, RoundingMode.HALF_UP);
        return amount.multiply(outstandingRatio);
    }

    private boolean isDimensionallyPermitted(Invoice invoice) {
        if (!dimensionalSecurityEvaluator.isAirportPermitted(invoice.getAirportCode())
                || !dimensionalSecurityEvaluator.isAirlinePermitted(invoice.getAirlineId())) {
            return false;
        }
        return invoice.getLineItems() == null || invoice.getLineItems().stream()
                .allMatch(item -> dimensionalSecurityEvaluator.isChargeCodePermitted(item.getChargeCode()));
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Airline financial reports are available only to airlines");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "MIS_VIEWER".equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: MIS_VIEWER");
        }
        return tenantContext.getCurrentTenantId();
    }

    private List<CurrencySummary> toSummaries(Map<String, SummaryAccumulator> values) {
        return values.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> CurrencySummary.builder()
                        .currency(entry.getKey())
                        .totalBilled(scale(entry.getValue().billed))
                        .totalPaid(scale(entry.getValue().paid))
                        .totalOutstanding(scale(entry.getValue().outstanding))
                        .invoiceCount(entry.getValue().invoiceCount)
                        .build())
                .toList();
    }

    private List<GroupedAmount> toGroups(Map<GroupKey, GroupAccumulator> values) {
        return values.entrySet().stream()
                .map(entry -> GroupedAmount.builder()
                        .key(entry.getKey().key())
                        .currency(entry.getKey().currency())
                        .totalBilled(scale(entry.getValue().billed))
                        .totalOutstanding(scale(entry.getValue().outstanding))
                        .invoiceCount(entry.getValue().invoiceCount)
                        .build())
                .sorted(Comparator.comparing(GroupedAmount::getCurrency)
                        .thenComparing(GroupedAmount::getTotalBilled, Comparator.reverseOrder())
                        .thenComparing(GroupedAmount::getKey))
                .toList();
    }

    private AirlineBilledAmountsResponse emptyResponse() {
        return AirlineBilledAmountsResponse.builder()
                .summaries(List.of())
                .bySupplier(List.of())
                .byAirport(List.of())
                .byService(List.of())
                .invoices(List.of())
                .build();
    }

    private BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || (value != null && value.equalsIgnoreCase(filter));
    }

    private record GroupKey(String key, String currency) {
    }

    private static final class SummaryAccumulator {
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal paid = BigDecimal.ZERO;
        private BigDecimal outstanding = BigDecimal.ZERO;
        private long invoiceCount;

        private void add(BigDecimal billedAmount, BigDecimal paidAmount, BigDecimal outstandingAmount) {
            billed = billed.add(billedAmount);
            paid = paid.add(paidAmount);
            outstanding = outstanding.add(outstandingAmount);
            invoiceCount++;
        }
    }

    private static final class GroupAccumulator {
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal outstanding = BigDecimal.ZERO;
        private long invoiceCount;

        private void add(BigDecimal billedAmount, BigDecimal outstandingAmount) {
            billed = billed.add(billedAmount);
            outstanding = outstanding.add(outstandingAmount);
            invoiceCount++;
        }
    }
}
