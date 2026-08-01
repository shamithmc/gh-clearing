package com.airline.service;

import com.airline.api.dto.AirportCostIndexResponse;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.MarketIntelligenceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class AirportCostIndexService {

    private final MarketIntelligenceRepository marketIntelligenceRepository;
    private final ChargeCodeRepository chargeCodeRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirportCostIndexService(
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
    public List<AirportCostIndexResponse> getIndex(
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
        List<AirportCostIndexResponse> results = new ArrayList<>();

        for (var aggregate : marketIntelligenceRepository.findAnonymizedAggregates(airlineId)) {
            if (!matches(aggregate.getAirportCode(), airportFilter)
                    || !matches(aggregate.getRegion(), regionFilter)
                    || !dimensionalSecurityEvaluator.isAirportPermitted(aggregate.getAirportCode())) {
                continue;
            }
            if (!matches(aggregate.getServiceType(), serviceFilter)
                    || !dimensionalSecurityEvaluator.isChargeCodePermitted(aggregate.getServiceType())
                    || !matches(aggregate.getAircraftType(), aircraftFilter)
                    || !matches(aggregate.getOperationType(), operationFilter)) {
                continue;
            }
            String serviceName = chargeCodeRepository.findById(aggregate.getServiceType())
                    .map(chargeCode -> chargeCode.getDisplayName())
                    .orElse(aggregate.getServiceType());
            results.add(AirportCostIndexResponse.builder()
                    .airportCode(aggregate.getAirportCode())
                    .airportName(aggregate.getAirportName())
                    .region(aggregate.getRegion())
                    .serviceType(aggregate.getServiceType())
                    .serviceName(serviceName)
                    .aircraftType(aggregate.getAircraftType())
                    .operationType(aggregate.getOperationType())
                    .currency(aggregate.getCurrency())
                    .averageCost(aggregate.getAverageCost().setScale(2, java.math.RoundingMode.HALF_UP))
                    .observationCount(aggregate.getObservationCount())
                    .build());
        }
        results.sort(Comparator.comparing(AirportCostIndexResponse::getRegion)
                .thenComparing(AirportCostIndexResponse::getAirportCode)
                .thenComparing(AirportCostIndexResponse::getServiceType)
                .thenComparing(AirportCostIndexResponse::getAircraftType)
                .thenComparing(AirportCostIndexResponse::getOperationType)
                .thenComparing(AirportCostIndexResponse::getCurrency));
        return results;
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Airport cost intelligence is available only to airlines");
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
