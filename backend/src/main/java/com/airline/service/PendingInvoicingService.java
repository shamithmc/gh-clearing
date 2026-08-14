package com.airline.service;

import com.airline.api.dto.PendingInvoicingResponse;
import com.airline.api.dto.PendingInvoicingResponse.CurrencySummary;
import com.airline.api.dto.PendingInvoicingResponse.GroupedAmount;
import com.airline.api.dto.PendingInvoicingResponse.PendingItem;
import com.airline.domain.BillingFrequency;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.OperationalFlight;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.PricingEngine;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceLineItemRepository;
import com.airline.repository.OperationalFlightRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PendingInvoicingService {
    private static final int DEFAULT_WINDOW_DAYS = 30;
    private static final int MAX_WINDOW_DAYS = 366;

    private final OperationalFlightRepository flightRepository;
    private final InvoiceLineItemRepository invoiceLineRepository;
    private final ContractRepository contractRepository;
    private final PricingEngine pricingEngine;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensions;

    public PendingInvoicingService(OperationalFlightRepository flightRepository,
                                   InvoiceLineItemRepository invoiceLineRepository,
                                   ContractRepository contractRepository,
                                   PricingEngine pricingEngine,
                                   TenantContext tenantContext,
                                   DimensionalSecurityEvaluator dimensions) {
        this.flightRepository = flightRepository;
        this.invoiceLineRepository = invoiceLineRepository;
        this.contractRepository = contractRepository;
        this.pricingEngine = pricingEngine;
        this.tenantContext = tenantContext;
        this.dimensions = dimensions;
    }

    @Transactional(readOnly = true)
    public PendingInvoicingResponse getPending(
            String airlineId, String airportCode, String serviceType,
            LocalDate requestedStart, LocalDate requestedEnd, LocalDate requestedAsOf) {
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Pending invoicing is available only to ground handlers");
        }
        requireRole("MIS_VIEWER");
        String supplierId = tenantContext.getCurrentTenantId();
        LocalDate asOf = requestedAsOf == null ? LocalDate.now() : requestedAsOf;
        LocalDate start = requestedStart == null ? asOf.minusDays(DEFAULT_WINDOW_DAYS) : requestedStart;
        LocalDate end = requestedEnd == null ? asOf : requestedEnd;
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Start date must not be after end date");
        }
        if (end.isAfter(asOf)) {
            throw new IllegalArgumentException("Pending invoicing end date must not be after as-of date");
        }
        if (ChronoUnit.DAYS.between(start, end) > MAX_WINDOW_DAYS) {
            throw new IllegalArgumentException("Pending invoicing date range must not exceed 366 days");
        }

        String airlineFilter = normalize(airlineId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        List<OperationalFlight> flights = flightRepository
                .findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(supplierId, start, end)
                .stream()
                .filter(flight -> flight.getAirlineId() != null && flight.getAirportCode() != null)
                .filter(flight -> matches(flight.getAirlineId(), airlineFilter))
                .filter(flight -> matches(flight.getAirportCode(), airportFilter))
                .filter(flight -> dimensions.isAirlinePermitted(flight.getAirlineId()))
                .filter(flight -> dimensions.isAirportPermitted(flight.getAirportCode()))
                .toList();
        if (flights.isEmpty()) {
            return empty(start, end, asOf);
        }

        Set<FlightServiceKey> invoiced = new HashSet<>();
        invoiceLineRepository.findInvoicedFlightServices(
                        supplierId, flights.stream().map(OperationalFlight::getId).toList())
                .forEach(line -> invoiced.add(
                        new FlightServiceKey(line.getOperationalFlightId(), normalize(line.getChargeCode()))));
        List<Contract> contracts = contractRepository
                .findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(supplierId, ContractStatus.APPROVED);

        List<PendingItem> items = new ArrayList<>();
        for (OperationalFlight flight : flights) {
            Contract contract = contracts.stream()
                    .filter(candidate -> candidate.getAirlineId().equals(flight.getAirlineId()))
                    .filter(candidate -> candidate.getAirportCode().equals(flight.getAirportCode()))
                    .filter(candidate -> !flight.getFlightDate().isBefore(candidate.getStartDate()))
                    .filter(candidate -> !flight.getFlightDate().isAfter(candidate.getEndDate()))
                    .findFirst().orElse(null);
            if (contract == null) {
                continue;
            }
            for (ServiceConfiguration service : safeServices(contract)) {
                String chargeCode = normalize(service.getChargeCode());
                if (!matches(chargeCode, serviceFilter)
                        || !dimensions.isChargeCodePermitted(chargeCode)
                        || service.getBillingFrequency() == null
                        || invoiced.contains(new FlightServiceKey(flight.getId(), chargeCode))) {
                    continue;
                }
                LocalDate dueDate = billingDueDate(
                        contract.getStartDate(), service.getBillingFrequency(), flight.getFlightDate());
                if (dueDate.isAfter(asOf)) {
                    continue;
                }
                BigDecimal amount = pricingEngine.calculateCharge(service, pricingInputs(flight));
                items.add(PendingItem.builder()
                        .operationalFlightId(flight.getId())
                        .flightNumber(flight.getFlightNumber())
                        .flightDate(flight.getFlightDate())
                        .billingDueDate(dueDate)
                        .contractId(contract.getId())
                        .airlineId(flight.getAirlineId())
                        .airportCode(flight.getAirportCode())
                        .serviceType(chargeCode)
                        .serviceName(service.getServiceName())
                        .billingFrequency(service.getBillingFrequency().name())
                        .currency(contract.getCurrency())
                        .pendingAmount(scale(amount))
                        .build());
            }
        }
        items.sort(Comparator.comparing(PendingItem::getBillingDueDate)
                .thenComparing(PendingItem::getAirlineId)
                .thenComparing(PendingItem::getOperationalFlightId)
                .thenComparing(PendingItem::getServiceType));
        return response(start, end, asOf, items);
    }

    private PendingInvoicingResponse response(
            LocalDate start, LocalDate end, LocalDate asOf, List<PendingItem> items) {
        Map<String, Accumulator> totals = new HashMap<>();
        Map<GroupKey, Accumulator> airlines = new HashMap<>();
        Map<GroupKey, Accumulator> airports = new HashMap<>();
        items.forEach(item -> {
            totals.computeIfAbsent(item.getCurrency(), ignored -> new Accumulator()).add(item.getPendingAmount());
            airlines.computeIfAbsent(new GroupKey(item.getAirlineId(), item.getCurrency()), ignored -> new Accumulator())
                    .add(item.getPendingAmount());
            airports.computeIfAbsent(new GroupKey(item.getAirportCode(), item.getCurrency()), ignored -> new Accumulator())
                    .add(item.getPendingAmount());
        });
        return PendingInvoicingResponse.builder()
                .startDate(start).endDate(end).asOfDate(asOf)
                .summaries(totals.entrySet().stream().sorted(Map.Entry.comparingByKey())
                        .map(entry -> CurrencySummary.builder().currency(entry.getKey())
                                .totalPending(scale(entry.getValue().amount)).itemCount(entry.getValue().count).build())
                        .toList())
                .byAirline(groups(airlines)).byAirport(groups(airports)).items(items).build();
    }

    private List<GroupedAmount> groups(Map<GroupKey, Accumulator> values) {
        return values.entrySet().stream()
                .map(entry -> GroupedAmount.builder().key(entry.getKey().key).currency(entry.getKey().currency)
                        .totalPending(scale(entry.getValue().amount)).itemCount(entry.getValue().count).build())
                .sorted(Comparator.comparing(GroupedAmount::getCurrency)
                        .thenComparing(GroupedAmount::getTotalPending, Comparator.reverseOrder())
                        .thenComparing(GroupedAmount::getKey)).toList();
    }

    private PendingInvoicingResponse empty(LocalDate start, LocalDate end, LocalDate asOf) {
        return PendingInvoicingResponse.builder().startDate(start).endDate(end).asOfDate(asOf)
                .summaries(List.of()).byAirline(List.of()).byAirport(List.of()).items(List.of()).build();
    }

    private LocalDate billingDueDate(LocalDate anchor, BillingFrequency frequency, LocalDate flightDate) {
        long occurrence = firstOccurrence(anchor, frequency, flightDate);
        LocalDate cycleStart = occurrenceDate(anchor, frequency, occurrence);
        if (cycleStart.isAfter(flightDate)) {
            occurrence--;
        }
        return occurrenceDate(anchor, frequency, occurrence + 1).minusDays(1);
    }

    private long firstOccurrence(LocalDate anchor, BillingFrequency frequency, LocalDate date) {
        if (!anchor.isBefore(date)) return 0;
        return switch (frequency) {
            case DAILY -> ChronoUnit.DAYS.between(anchor, date);
            case WEEKLY -> ChronoUnit.WEEKS.between(anchor, date);
            case MONTHLY -> ChronoUnit.MONTHS.between(anchor, date);
            case QUARTERLY -> ChronoUnit.MONTHS.between(anchor, date) / 3;
        };
    }

    private LocalDate occurrenceDate(LocalDate anchor, BillingFrequency frequency, long occurrence) {
        return switch (frequency) {
            case DAILY -> anchor.plusDays(occurrence);
            case WEEKLY -> anchor.plusWeeks(occurrence);
            case MONTHLY -> anchor.plusMonths(occurrence);
            case QUARTERLY -> anchor.plusMonths(Math.multiplyExact(occurrence, 3));
        };
    }

    private Map<String, Object> pricingInputs(OperationalFlight flight) {
        Map<String, Object> inputs = new HashMap<>(flight.getQuantityDrivers());
        inputs.put("tailNumber", flight.getTailId());
        if (flight.getAircraftType() != null) inputs.put("aircraftType", flight.getAircraftType());
        return inputs;
    }

    private List<ServiceConfiguration> safeServices(Contract contract) {
        return contract.getServices() == null ? List.of() : contract.getServices();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || filter.equals(normalize(value));
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void requireRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> role.equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: " + role);
        }
    }

    private record FlightServiceKey(String flightId, String chargeCode) {}
    private record GroupKey(String key, String currency) {}
    private static class Accumulator {
        private BigDecimal amount = BigDecimal.ZERO;
        private long count;
        private void add(BigDecimal value) { amount = amount.add(value); count++; }
    }
}
