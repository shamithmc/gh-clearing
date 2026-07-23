package com.airline.service;

import com.airline.api.dto.PricingBenchmarkResponse;
import com.airline.domain.Airport;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.AirportRepository;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.repository.MtowRecordRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PricingBenchmarkService {

    static final String PREMIUM = "TOP_25_PERCENT_PREMIUM";
    static final String MID_MARKET = "MID_50_PERCENT";
    static final String DISCOUNT = "BOTTOM_25_PERCENT_DISCOUNT";

    private static final Set<InvoiceStatus> ELIGIBLE_STATUSES =
            Set.of(InvoiceStatus.SENT, InvoiceStatus.DISPUTED, InvoiceStatus.PAID);
    private static final int MINIMUM_SUPPLIERS = 2;

    private final InvoiceRepository invoiceRepository;
    private final AirportRepository airportRepository;
    private final ChargeCodeRepository chargeCodeRepository;
    private final MtowRecordRepository mtowRecordRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public PricingBenchmarkService(
            InvoiceRepository invoiceRepository,
            AirportRepository airportRepository,
            ChargeCodeRepository chargeCodeRepository,
            MtowRecordRepository mtowRecordRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.invoiceRepository = invoiceRepository;
        this.airportRepository = airportRepository;
        this.chargeCodeRepository = chargeCodeRepository;
        this.mtowRecordRepository = mtowRecordRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public List<PricingBenchmarkResponse> getBenchmarks(
            String airportCode,
            String region,
            String serviceType,
            String aircraftType,
            String operationType) {
        String airlineId = requireAirlineMisViewer();
        if (!dimensionalSecurityEvaluator.isAirlinePermitted(airlineId)) {
            return List.of();
        }

        String airportFilter = normalize(airportCode);
        String regionFilter = normalize(region);
        String serviceFilter = normalize(serviceType);
        String aircraftFilter = normalize(aircraftType);
        String operationFilter = normalize(operationType);
        Map<BenchmarkKey, BenchmarkAggregate> aggregates = new HashMap<>();

        for (Invoice invoice : invoiceRepository.findByStatusIn(ELIGIBLE_STATUSES)) {
            Airport airport = airportRepository.findById(invoice.getAirportCode()).orElse(null);
            if (airport == null
                    || !matches(airport.getIataCode(), airportFilter)
                    || !matches(airport.getRegion(), regionFilter)
                    || !dimensionalSecurityEvaluator.isAirportPermitted(airport.getIataCode())) {
                continue;
            }

            for (InvoiceLineItem item : invoice.getLineItems()) {
                if (item.getCalculatedAmount() == null
                        || !matches(item.getChargeCode(), serviceFilter)
                        || !dimensionalSecurityEvaluator.isChargeCodePermitted(item.getChargeCode())) {
                    continue;
                }
                String resolvedAircraft = resolveAircraftType(item);
                String resolvedOperation = resolveOperationType(item);
                if (!matches(resolvedAircraft, aircraftFilter)
                        || !matches(resolvedOperation, operationFilter)) {
                    continue;
                }

                BenchmarkKey key = new BenchmarkKey(
                        airport.getIataCode(),
                        airport.getName(),
                        airport.getRegion(),
                        item.getChargeCode(),
                        resolvedAircraft,
                        resolvedOperation,
                        invoice.getCurrency());
                aggregates.computeIfAbsent(key, ignored -> new BenchmarkAggregate())
                        .add(invoice.getSupplierId(), invoice.getAirlineId(), airlineId,
                                item.getCalculatedAmount());
            }
        }

        List<PricingBenchmarkResponse> results = new ArrayList<>();
        aggregates.forEach((key, aggregate) -> {
            if (aggregate.suppliers.size() < MINIMUM_SUPPLIERS
                    || aggregate.airlineObservations == 0) {
                return;
            }
            BigDecimal airlineAverage = aggregate.airlineTotal.divide(
                    BigDecimal.valueOf(aggregate.airlineObservations), 2, RoundingMode.HALF_UP);
            String serviceName = chargeCodeRepository.findById(key.serviceType())
                    .map(chargeCode -> chargeCode.getDisplayName())
                    .orElse(key.serviceType());
            results.add(PricingBenchmarkResponse.builder()
                    .airportCode(key.airportCode())
                    .airportName(key.airportName())
                    .region(key.region())
                    .serviceType(key.serviceType())
                    .serviceName(serviceName)
                    .aircraftType(key.aircraftType())
                    .operationType(key.operationType())
                    .currency(key.currency())
                    .airlineAverageCost(airlineAverage)
                    .airlineObservationCount(aggregate.airlineObservations)
                    .marketPosition(classify(airlineAverage, aggregate.marketAmounts))
                    .build());
        });
        results.sort(Comparator.comparing(PricingBenchmarkResponse::getRegion)
                .thenComparing(PricingBenchmarkResponse::getAirportCode)
                .thenComparing(PricingBenchmarkResponse::getServiceType)
                .thenComparing(PricingBenchmarkResponse::getAircraftType)
                .thenComparing(PricingBenchmarkResponse::getOperationType)
                .thenComparing(PricingBenchmarkResponse::getCurrency));
        return results;
    }

    private String classify(BigDecimal airlineAverage, List<BigDecimal> marketAmounts) {
        List<BigDecimal> sorted = marketAmounts.stream().sorted().toList();
        BigDecimal lowerQuartile = percentile(sorted, new BigDecimal("0.25"));
        BigDecimal upperQuartile = percentile(sorted, new BigDecimal("0.75"));
        if (lowerQuartile.compareTo(upperQuartile) == 0) {
            return MID_MARKET;
        }
        if (airlineAverage.compareTo(upperQuartile) >= 0) {
            return PREMIUM;
        }
        if (airlineAverage.compareTo(lowerQuartile) <= 0) {
            return DISCOUNT;
        }
        return MID_MARKET;
    }

    private BigDecimal percentile(List<BigDecimal> sorted, BigDecimal percentile) {
        if (sorted.size() == 1) {
            return sorted.getFirst();
        }
        BigDecimal position = BigDecimal.valueOf(sorted.size() - 1).multiply(percentile);
        int lower = position.setScale(0, RoundingMode.FLOOR).intValue();
        int upper = position.setScale(0, RoundingMode.CEILING).intValue();
        if (lower == upper) {
            return sorted.get(lower);
        }
        BigDecimal fraction = position.subtract(BigDecimal.valueOf(lower));
        return sorted.get(lower).add(
                sorted.get(upper).subtract(sorted.get(lower)).multiply(fraction));
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Pricing benchmarks are available only to airlines");
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

    private String resolveAircraftType(InvoiceLineItem item) {
        String explicitType = normalize(item.getAircraftType());
        if (explicitType != null) {
            return explicitType;
        }
        String registration = normalize(item.getAircraftReg());
        if (registration == null) {
            return "UNKNOWN";
        }
        return mtowRecordRepository.findById(registration)
                .map(record -> normalize(record.getAircraftType()))
                .orElse("UNKNOWN");
    }

    private String resolveOperationType(InvoiceLineItem item) {
        String originCode = normalize(item.getOrigin());
        String destinationCode = normalize(item.getDestination());
        if (originCode == null || destinationCode == null) {
            return "UNKNOWN";
        }
        Airport origin = airportRepository.findById(originCode).orElse(null);
        Airport destination = airportRepository.findById(destinationCode).orElse(null);
        if (origin == null || destination == null) {
            return "UNKNOWN";
        }
        return origin.getCountry().equalsIgnoreCase(destination.getCountry())
                ? "DOMESTIC"
                : "INTERNATIONAL";
    }

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || (value != null && value.equalsIgnoreCase(filter));
    }

    private record BenchmarkKey(
            String airportCode,
            String airportName,
            String region,
            String serviceType,
            String aircraftType,
            String operationType,
            String currency) {
    }

    private static final class BenchmarkAggregate {
        private final Set<String> suppliers = new HashSet<>();
        private final List<BigDecimal> marketAmounts = new ArrayList<>();
        private BigDecimal airlineTotal = BigDecimal.ZERO;
        private long airlineObservations;

        private void add(
                String supplierId,
                String observationAirlineId,
                String currentAirlineId,
                BigDecimal amount) {
            if (supplierId == null || amount == null) {
                return;
            }
            suppliers.add(supplierId);
            marketAmounts.add(amount);
            if (currentAirlineId.equals(observationAirlineId)) {
                airlineTotal = airlineTotal.add(amount);
                airlineObservations++;
            }
        }
    }
}
