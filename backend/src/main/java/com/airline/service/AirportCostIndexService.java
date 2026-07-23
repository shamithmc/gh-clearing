package com.airline.service;

import com.airline.api.dto.AirportCostIndexResponse;
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
public class AirportCostIndexService {

    private static final Set<InvoiceStatus> ELIGIBLE_STATUSES =
            Set.of(InvoiceStatus.SENT, InvoiceStatus.DISPUTED, InvoiceStatus.PAID);
    private static final int MINIMUM_SUPPLIERS = 2;

    private final InvoiceRepository invoiceRepository;
    private final AirportRepository airportRepository;
    private final ChargeCodeRepository chargeCodeRepository;
    private final MtowRecordRepository mtowRecordRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirportCostIndexService(
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
        Map<IndexKey, Aggregate> aggregates = new HashMap<>();

        for (Invoice invoice : invoiceRepository.findByStatusIn(ELIGIBLE_STATUSES)) {
            Airport airport = airportRepository.findById(invoice.getAirportCode()).orElse(null);
            if (airport == null
                    || !matches(airport.getIataCode(), airportFilter)
                    || !matches(airport.getRegion(), regionFilter)
                    || !dimensionalSecurityEvaluator.isAirportPermitted(airport.getIataCode())) {
                continue;
            }

            for (InvoiceLineItem item : invoice.getLineItems()) {
                if (!matches(item.getChargeCode(), serviceFilter)
                        || !dimensionalSecurityEvaluator.isChargeCodePermitted(item.getChargeCode())) {
                    continue;
                }
                String resolvedAircraftType = resolveAircraftType(item);
                String resolvedOperationType = resolveOperationType(item);
                if (!matches(resolvedAircraftType, aircraftFilter)
                        || !matches(resolvedOperationType, operationFilter)) {
                    continue;
                }

                IndexKey key = new IndexKey(
                        airport.getIataCode(),
                        airport.getName(),
                        airport.getRegion(),
                        item.getChargeCode(),
                        resolvedAircraftType,
                        resolvedOperationType,
                        invoice.getCurrency());
                aggregates.computeIfAbsent(key, ignored -> new Aggregate())
                        .add(invoice.getSupplierId(), item.getCalculatedAmount());
            }
        }

        List<AirportCostIndexResponse> results = new ArrayList<>();
        aggregates.forEach((key, aggregate) -> {
            if (aggregate.suppliers.size() < MINIMUM_SUPPLIERS) {
                return;
            }
            String serviceName = chargeCodeRepository.findById(key.serviceType())
                    .map(chargeCode -> chargeCode.getDisplayName())
                    .orElse(key.serviceType());
            results.add(AirportCostIndexResponse.builder()
                    .airportCode(key.airportCode())
                    .airportName(key.airportName())
                    .region(key.region())
                    .serviceType(key.serviceType())
                    .serviceName(serviceName)
                    .aircraftType(key.aircraftType())
                    .operationType(key.operationType())
                    .currency(key.currency())
                    .averageCost(aggregate.total.divide(
                            BigDecimal.valueOf(aggregate.observations), 2, RoundingMode.HALF_UP))
                    .observationCount(aggregate.observations)
                    .build());
        });
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
        Airport origin = airportRepository.findById(normalize(item.getOrigin())).orElse(null);
        Airport destination = airportRepository.findById(normalize(item.getDestination())).orElse(null);
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

    private record IndexKey(
            String airportCode,
            String airportName,
            String region,
            String serviceType,
            String aircraftType,
            String operationType,
            String currency) {
    }

    private static final class Aggregate {
        private final Set<String> suppliers = new HashSet<>();
        private BigDecimal total = BigDecimal.ZERO;
        private long observations;

        private void add(String supplierId, BigDecimal amount) {
            if (supplierId == null || amount == null) {
                return;
            }
            suppliers.add(supplierId);
            total = total.add(amount);
            observations++;
        }
    }
}
