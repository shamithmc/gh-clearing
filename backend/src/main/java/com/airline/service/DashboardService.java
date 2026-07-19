package com.airline.service;

import com.airline.api.dto.DashboardDtos.*;
import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final ContractRepository contractRepository;
    private final TenantContext tenantContext;

    public DashboardService(InvoiceRepository invoiceRepository,
                            ContractRepository contractRepository,
                            TenantContext tenantContext) {
        this.invoiceRepository = invoiceRepository;
        this.contractRepository = contractRepository;
        this.tenantContext = tenantContext;
    }

    private List<Invoice> getFilteredInvoices() {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();

        List<Invoice> all = invoiceRepository.findAllByTenantId(tenantId);
        if ("GROUND_HANDLER".equals(tenantType)) {
            return all.stream()
                    .filter(i -> i.getSupplierId().equals(tenantId))
                    .collect(Collectors.toList());
        } else {
            return all.stream()
                    .filter(i -> i.getAirlineId().equals(tenantId))
                    .collect(Collectors.toList());
        }
    }

    private List<Contract> getFilteredContracts() {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();

        if ("GROUND_HANDLER".equals(tenantType)) {
            return contractRepository.findByGroundHandlerId(tenantId);
        } else {
            // Find active/submitted contracts for the airline
            return contractRepository.findAll().stream()
                    .filter(c -> c.getAirlineId().equals(tenantId))
                    .collect(Collectors.toList());
        }
    }

    public ReceivablesSummary getReceivablesSummary() {
        List<Invoice> invoices = getFilteredInvoices().stream()
                .filter(i -> i.getStatus() == InvoiceStatus.SENT || i.getStatus() == InvoiceStatus.DISPUTED)
                .collect(Collectors.toList());

        BigDecimal totalOutstanding = BigDecimal.ZERO;
        Map<String, BigDecimal> airlineMap = new HashMap<>();
        Map<String, BigDecimal> airportMap = new HashMap<>();

        BigDecimal zeroToThirty = BigDecimal.ZERO;
        BigDecimal thirtyOneToSixty = BigDecimal.ZERO;
        BigDecimal sixtyOneToNinety = BigDecimal.ZERO;
        BigDecimal ninetyPlus = BigDecimal.ZERO;

        LocalDate today = LocalDate.now();

        for (Invoice invoice : invoices) {
            BigDecimal outstanding = invoice.getTotalAmount();
            if (invoice.getCreditNoteAmount() != null) {
                outstanding = outstanding.subtract(invoice.getCreditNoteAmount());
            }
            if (outstanding.compareTo(BigDecimal.ZERO) < 0) {
                outstanding = BigDecimal.ZERO;
            }

            totalOutstanding = totalOutstanding.add(outstanding);

            // Group by Airline
            airlineMap.put(invoice.getAirlineId(), airlineMap.getOrDefault(invoice.getAirlineId(), BigDecimal.ZERO).add(outstanding));

            // Group by Airport
            airportMap.put(invoice.getAirportCode(), airportMap.getOrDefault(invoice.getAirportCode(), BigDecimal.ZERO).add(outstanding));

            // Aging calculation (days since issueDate)
            long age = ChronoUnit.DAYS.between(invoice.getIssueDate(), today);
            if (age <= 30) {
                zeroToThirty = zeroToThirty.add(outstanding);
            } else if (age <= 60) {
                thirtyOneToSixty = thirtyOneToSixty.add(outstanding);
            } else if (age <= 90) {
                sixtyOneToNinety = sixtyOneToNinety.add(outstanding);
            } else {
                ninetyPlus = ninetyPlus.add(outstanding);
            }
        }

        List<GroupedReceivable> byAirline = airlineMap.entrySet().stream()
                .map(e -> new GroupedReceivable(e.getKey(), e.getValue().setScale(2, RoundingMode.HALF_UP)))
                .sorted(Comparator.comparing(GroupedReceivable::getAmount).reversed())
                .collect(Collectors.toList());

        List<GroupedReceivable> byAirport = airportMap.entrySet().stream()
                .map(e -> new GroupedReceivable(e.getKey(), e.getValue().setScale(2, RoundingMode.HALF_UP)))
                .sorted(Comparator.comparing(GroupedReceivable::getAmount).reversed())
                .collect(Collectors.toList());

        return ReceivablesSummary.builder()
                .totalOutstanding(totalOutstanding.setScale(2, RoundingMode.HALF_UP))
                .byAirline(byAirline)
                .byAirport(byAirport)
                .aging(AgingBuckets.builder()
                        .zeroToThirty(zeroToThirty.setScale(2, RoundingMode.HALF_UP))
                        .thirtyOneToSixty(thirtyOneToSixty.setScale(2, RoundingMode.HALF_UP))
                        .sixtyOneToNinety(sixtyOneToNinety.setScale(2, RoundingMode.HALF_UP))
                        .ninetyPlus(ninetyPlus.setScale(2, RoundingMode.HALF_UP))
                        .build())
                .build();
    }

    public List<InvoicedTrend> getInvoicedTrend() {
        List<Invoice> invoices = getFilteredInvoices().stream()
                .filter(i -> i.getStatus() != InvoiceStatus.DRAFT)
                .collect(Collectors.toList());

        Map<String, BigDecimal> monthlyMap = new TreeMap<>(); // Sorted keys

        for (Invoice invoice : invoices) {
            String month = invoice.getIssueDate().format(DateTimeFormatter.ofPattern("yyyy-MM"));
            monthlyMap.put(month, monthlyMap.getOrDefault(month, BigDecimal.ZERO).add(invoice.getTotalAmount()));
        }

        return monthlyMap.entrySet().stream()
                .map(e -> new InvoicedTrend(e.getKey(), e.getValue().setScale(2, RoundingMode.HALF_UP)))
                .collect(Collectors.toList());
    }

    public List<RevenuePerFlightTrend> getRevenuePerFlightTrend() {
        List<Invoice> invoices = getFilteredInvoices().stream()
                .filter(i -> i.getStatus() != InvoiceStatus.DRAFT)
                .collect(Collectors.toList());

        Map<String, List<BigDecimal>> monthlyFlightsMap = new TreeMap<>();

        for (Invoice invoice : invoices) {
            String month = invoice.getIssueDate().format(DateTimeFormatter.ofPattern("yyyy-MM"));
            List<BigDecimal> amounts = monthlyFlightsMap.computeIfAbsent(month, k -> new ArrayList<>());
            if (invoice.getLineItems() != null) {
                for (InvoiceLineItem item : invoice.getLineItems()) {
                    if (item.getCalculatedAmount() != null) {
                        amounts.add(item.getCalculatedAmount());
                    }
                }
            }
        }

        List<RevenuePerFlightTrend> trend = new ArrayList<>();
        for (Map.Entry<String, List<BigDecimal>> entry : monthlyFlightsMap.entrySet()) {
            List<BigDecimal> flights = entry.getValue();
            BigDecimal average = BigDecimal.ZERO;
            if (!flights.isEmpty()) {
                BigDecimal sum = flights.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                average = sum.divide(BigDecimal.valueOf(flights.size()), 2, RoundingMode.HALF_UP);
            }
            trend.add(new RevenuePerFlightTrend(entry.getKey(), average));
        }

        return trend;
    }

    public List<ExpiringContract> getExpiringContracts() {
        List<Contract> contracts = getFilteredContracts().stream()
                .filter(c -> c.getStatus() == ContractStatus.APPROVED)
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<ExpiringContract> list = new ArrayList<>();

        for (Contract contract : contracts) {
            long daysRemaining = ChronoUnit.DAYS.between(today, contract.getEndDate());
            if (daysRemaining >= 0 && daysRemaining <= 90) {
                list.add(ExpiringContract.builder()
                        .id(contract.getId())
                        .airlineId(contract.getAirlineId())
                        .airportCode(contract.getAirportCode())
                        .endDate(contract.getEndDate())
                        .daysRemaining(daysRemaining)
                        .build());
            }
        }

        list.sort(Comparator.comparingLong(ExpiringContract::getDaysRemaining));
        return list;
    }
}
