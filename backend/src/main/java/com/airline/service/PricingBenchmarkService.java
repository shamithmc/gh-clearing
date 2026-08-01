package com.airline.service;

import com.airline.api.dto.PricingBenchmarkResponse;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.MarketIntelligenceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class PricingBenchmarkService {

    static final String PREMIUM = "TOP_25_PERCENT_PREMIUM";
    static final String MID_MARKET = "MID_50_PERCENT";
    static final String DISCOUNT = "BOTTOM_25_PERCENT_DISCOUNT";

    private final MarketIntelligenceRepository marketIntelligenceRepository;
    private final ChargeCodeRepository chargeCodeRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public PricingBenchmarkService(
            MarketIntelligenceRepository marketIntelligenceRepository,
            ChargeCodeRepository chargeCodeRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.marketIntelligenceRepository = marketIntelligenceRepository;
        this.chargeCodeRepository = chargeCodeRepository;
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
        List<PricingBenchmarkResponse> results = new ArrayList<>();

        for (var aggregate : marketIntelligenceRepository.findAnonymizedAggregates(airlineId)) {
            if (!matches(aggregate.getAirportCode(), airportFilter)
                    || !matches(aggregate.getRegion(), regionFilter)
                    || !dimensionalSecurityEvaluator.isAirportPermitted(aggregate.getAirportCode())) {
                continue;
            }
            if (!matches(aggregate.getServiceType(), serviceFilter)
                    || !dimensionalSecurityEvaluator.isChargeCodePermitted(aggregate.getServiceType())
                    || !matches(aggregate.getAircraftType(), aircraftFilter)
                    || !matches(aggregate.getOperationType(), operationFilter)
                    || aggregate.getAirlineObservationCount() == 0) {
                continue;
            }
            BigDecimal airlineAverage = aggregate.getAirlineAverageCost()
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            String serviceName = chargeCodeRepository.findById(aggregate.getServiceType())
                    .map(chargeCode -> chargeCode.getDisplayName())
                    .orElse(aggregate.getServiceType());
            results.add(PricingBenchmarkResponse.builder()
                    .airportCode(aggregate.getAirportCode())
                    .airportName(aggregate.getAirportName())
                    .region(aggregate.getRegion())
                    .serviceType(aggregate.getServiceType())
                    .serviceName(serviceName)
                    .aircraftType(aggregate.getAircraftType())
                    .operationType(aggregate.getOperationType())
                    .currency(aggregate.getCurrency())
                    .airlineAverageCost(airlineAverage)
                    .airlineObservationCount(aggregate.getAirlineObservationCount())
                    .marketPosition(classify(airlineAverage,
                            aggregate.getLowerQuartile(), aggregate.getUpperQuartile()))
                    .build());
        }
        results.sort(Comparator.comparing(PricingBenchmarkResponse::getRegion)
                .thenComparing(PricingBenchmarkResponse::getAirportCode)
                .thenComparing(PricingBenchmarkResponse::getServiceType)
                .thenComparing(PricingBenchmarkResponse::getAircraftType)
                .thenComparing(PricingBenchmarkResponse::getOperationType)
                .thenComparing(PricingBenchmarkResponse::getCurrency));
        return results;
    }

    private String classify(
            BigDecimal airlineAverage, BigDecimal lowerQuartile, BigDecimal upperQuartile) {
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

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || (value != null && value.equalsIgnoreCase(filter));
    }

}
