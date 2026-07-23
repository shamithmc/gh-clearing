package com.airline.service;

import com.airline.api.dto.AirlineExpectedBillingResponse;
import com.airline.api.dto.AirlineExpectedBillingResponse.CurrencySummary;
import com.airline.api.dto.AirlineExpectedBillingResponse.GroupedAmount;
import com.airline.api.dto.AirlineExpectedBillingResponse.ProjectionDrilldown;
import com.airline.api.dto.AirlineExpectedBillingResponse.TimelinePoint;
import com.airline.domain.BillingFrequency;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractRepository;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AirlineExpectedBillingService {

    private static final int DEFAULT_WINDOW_DAYS = 30;
    private static final int MAX_WINDOW_DAYS = 366;

    private final ContractRepository contractRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirlineExpectedBillingService(
            ContractRepository contractRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.contractRepository = contractRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public AirlineExpectedBillingResponse getExpectedBilling(
            String supplierId,
            String airportCode,
            String serviceType,
            LocalDate requestedStartDate,
            LocalDate requestedEndDate) {
        String airlineId = requireAirlineMisViewer();
        LocalDate startDate = requestedStartDate == null ? LocalDate.now() : requestedStartDate;
        LocalDate endDate = requestedEndDate == null
                ? startDate.plusDays(DEFAULT_WINDOW_DAYS)
                : requestedEndDate;
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date must not be after end date");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > MAX_WINDOW_DAYS) {
            throw new IllegalArgumentException(
                    "Expected billing date range must not exceed 366 days");
        }
        if (!dimensionalSecurityEvaluator.isAirlinePermitted(airlineId)) {
            return emptyResponse(startDate, endDate);
        }

        String supplierFilter = normalize(supplierId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        Map<String, Accumulator> summaries = new HashMap<>();
        Map<DateCurrencyKey, Accumulator> timeline = new HashMap<>();
        Map<GroupKey, Accumulator> suppliers = new HashMap<>();
        Map<GroupKey, Accumulator> airports = new HashMap<>();
        Map<GroupKey, Accumulator> services = new HashMap<>();
        List<ProjectionDrilldown> projections = new ArrayList<>();

        contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                        airlineId, ContractStatus.APPROVED).stream()
                .filter(contract -> airlineId.equals(contract.getAirlineId()))
                .filter(contract -> matches(contract.getGroundHandlerId(), supplierFilter))
                .filter(contract -> matches(contract.getAirportCode(), airportFilter))
                .filter(contract -> !contract.getEndDate().isBefore(startDate))
                .filter(contract -> !contract.getStartDate().isAfter(endDate))
                .filter(this::isContractDimensionallyPermitted)
                .forEach(contract -> safeServices(contract).stream()
                        .filter(service -> matches(service.getChargeCode(), serviceFilter))
                        .filter(service -> service.getBillingFrequency() != null)
                        .forEach(service -> projectService(
                                contract, service, startDate, endDate, summaries, timeline,
                                suppliers, airports, services, projections)));

        return AirlineExpectedBillingResponse.builder()
                .startDate(startDate)
                .endDate(endDate)
                .summaries(toSummaries(summaries))
                .timeline(toTimeline(timeline))
                .bySupplier(toGroups(suppliers))
                .byAirport(toGroups(airports))
                .byService(toGroups(services))
                .projections(projections.stream()
                        .sorted(Comparator.comparing(ProjectionDrilldown::getExpectedDate)
                                .thenComparing(ProjectionDrilldown::getSupplierId)
                                .thenComparing(ProjectionDrilldown::getServiceType))
                        .toList())
                .build();
    }

    private void projectService(
            Contract contract,
            ServiceConfiguration service,
            LocalDate startDate,
            LocalDate endDate,
            Map<String, Accumulator> summaries,
            Map<DateCurrencyKey, Accumulator> timeline,
            Map<GroupKey, Accumulator> suppliers,
            Map<GroupKey, Accumulator> airports,
            Map<GroupKey, Accumulator> services,
            List<ProjectionDrilldown> projections) {
        BigDecimal amount = expectedAmount(service);
        if (amount == null) {
            return;
        }
        LocalDate lastDate = contract.getEndDate().isBefore(endDate)
                ? contract.getEndDate()
                : endDate;
        String currency = contract.getCurrency();

        for (long occurrence = firstOccurrence(
                contract.getStartDate(), service.getBillingFrequency(), startDate); ; occurrence++) {
            LocalDate expectedDate = occurrenceDate(
                    contract.getStartDate(), service.getBillingFrequency(), occurrence);
            if (expectedDate.isAfter(lastDate)) {
                break;
            }
            if (expectedDate.isBefore(startDate)) {
                continue;
            }
            summaries.computeIfAbsent(currency, ignored -> new Accumulator()).add(amount);
            timeline.computeIfAbsent(
                    new DateCurrencyKey(expectedDate, currency), ignored -> new Accumulator()).add(amount);
            suppliers.computeIfAbsent(
                    new GroupKey(contract.getGroundHandlerId(), currency),
                    ignored -> new Accumulator()).add(amount);
            airports.computeIfAbsent(
                    new GroupKey(contract.getAirportCode(), currency),
                    ignored -> new Accumulator()).add(amount);
            services.computeIfAbsent(
                    new GroupKey(service.getChargeCode(), currency),
                    ignored -> new Accumulator()).add(amount);
            projections.add(ProjectionDrilldown.builder()
                    .expectedDate(expectedDate)
                    .contractId(contract.getId())
                    .serviceId(service.getId())
                    .supplierId(contract.getGroundHandlerId())
                    .airportCode(contract.getAirportCode())
                    .serviceType(service.getChargeCode())
                    .serviceName(service.getServiceName())
                    .billingFrequency(service.getBillingFrequency().name())
                    .currency(currency)
                    .expectedAmount(scale(amount))
                    .build());
        }
    }

    private LocalDate occurrenceDate(
            LocalDate anchor, BillingFrequency frequency, long occurrence) {
        return switch (frequency) {
            case DAILY -> anchor.plusDays(occurrence);
            case WEEKLY -> anchor.plusWeeks(occurrence);
            case MONTHLY -> anchor.plusMonths(occurrence);
            case QUARTERLY -> anchor.plusMonths(Math.multiplyExact(occurrence, 3));
        };
    }

    private long firstOccurrence(
            LocalDate anchor, BillingFrequency frequency, LocalDate startDate) {
        if (!anchor.isBefore(startDate)) {
            return 0;
        }
        long candidate = switch (frequency) {
            case DAILY -> ChronoUnit.DAYS.between(anchor, startDate);
            case WEEKLY -> ChronoUnit.WEEKS.between(anchor, startDate);
            case MONTHLY -> ChronoUnit.MONTHS.between(
                    anchor.withDayOfMonth(1), startDate.withDayOfMonth(1));
            case QUARTERLY -> ChronoUnit.MONTHS.between(
                    anchor.withDayOfMonth(1), startDate.withDayOfMonth(1)) / 3;
        };
        return occurrenceDate(anchor, frequency, candidate).isBefore(startDate)
                ? candidate + 1
                : candidate;
    }

    private BigDecimal expectedAmount(ServiceConfiguration service) {
        if (service.getRateDetails() == null) {
            return null;
        }
        Object rawAmount = service.getRateDetails().get("expectedAmount");
        if (rawAmount == null) {
            return null;
        }
        try {
            BigDecimal amount = new BigDecimal(rawAmount.toString());
            return amount.compareTo(BigDecimal.ZERO) > 0 ? amount : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isContractDimensionallyPermitted(Contract contract) {
        if (!dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())
                || !dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())) {
            return false;
        }
        return safeServices(contract).stream()
                .allMatch(service ->
                        dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode()));
    }

    private List<ServiceConfiguration> safeServices(Contract contract) {
        return contract.getServices() == null ? List.of() : contract.getServices();
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Expected billing reports are available only to airlines");
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

    private List<CurrencySummary> toSummaries(Map<String, Accumulator> values) {
        return values.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> CurrencySummary.builder()
                        .currency(entry.getKey())
                        .totalExpected(scale(entry.getValue().amount))
                        .occurrenceCount(entry.getValue().count)
                        .build())
                .toList();
    }

    private List<TimelinePoint> toTimeline(Map<DateCurrencyKey, Accumulator> values) {
        return values.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(
                        Comparator.comparing(DateCurrencyKey::date)
                                .thenComparing(DateCurrencyKey::currency)))
                .map(entry -> TimelinePoint.builder()
                        .date(entry.getKey().date())
                        .currency(entry.getKey().currency())
                        .amount(scale(entry.getValue().amount))
                        .occurrenceCount(entry.getValue().count)
                        .build())
                .toList();
    }

    private List<GroupedAmount> toGroups(Map<GroupKey, Accumulator> values) {
        return values.entrySet().stream()
                .map(entry -> GroupedAmount.builder()
                        .key(entry.getKey().key())
                        .currency(entry.getKey().currency())
                        .totalExpected(scale(entry.getValue().amount))
                        .occurrenceCount(entry.getValue().count)
                        .build())
                .sorted(Comparator.comparing(GroupedAmount::getCurrency)
                        .thenComparing(GroupedAmount::getTotalExpected, Comparator.reverseOrder())
                        .thenComparing(GroupedAmount::getKey))
                .toList();
    }

    private AirlineExpectedBillingResponse emptyResponse(
            LocalDate startDate, LocalDate endDate) {
        return AirlineExpectedBillingResponse.builder()
                .startDate(startDate)
                .endDate(endDate)
                .summaries(List.of())
                .timeline(List.of())
                .bySupplier(List.of())
                .byAirport(List.of())
                .byService(List.of())
                .projections(List.of())
                .build();
    }

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || filter.equals(normalize(value));
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private record DateCurrencyKey(LocalDate date, String currency) {
    }

    private record GroupKey(String key, String currency) {
    }

    private static class Accumulator {
        private BigDecimal amount = BigDecimal.ZERO;
        private long count;

        private void add(BigDecimal value) {
            amount = amount.add(value);
            count++;
        }
    }
}
