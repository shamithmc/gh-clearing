package com.airline.service;

import com.airline.api.dto.AirlineContractExpiryResponse;
import com.airline.api.dto.AirlineContractExpiryResponse.AirportExpiryPoint;
import com.airline.api.dto.AirlineContractExpiryResponse.ExpiringContract;
import com.airline.api.dto.AirlineContractExpiryResponse.Summary;
import com.airline.domain.Airport;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.AirportRepository;
import com.airline.repository.ContractRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AirlineContractExpiryService {

    private static final int MAX_HORIZON_DAYS = 365;

    private final ContractRepository contractRepository;
    private final AirportRepository airportRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirlineContractExpiryService(
            ContractRepository contractRepository,
            AirportRepository airportRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.contractRepository = contractRepository;
        this.airportRepository = airportRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public AirlineContractExpiryResponse getContractExpiry(
            String supplierId,
            String airportCode,
            String serviceType,
            int horizonDays) {
        String airlineId = requireAirlineMisViewer();
        if (horizonDays < 1 || horizonDays > MAX_HORIZON_DAYS) {
            throw new IllegalArgumentException("Expiry horizon must be between 1 and 365 days");
        }
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusDays(horizonDays);
        if (!dimensionalSecurityEvaluator.isAirlinePermitted(airlineId)) {
            return emptyResponse(today, horizonDays);
        }

        String supplierFilter = normalize(supplierId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        List<Contract> matchingContracts = contractRepository
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(
                        airlineId, ContractStatus.APPROVED).stream()
                .filter(contract -> airlineId.equals(contract.getAirlineId()))
                .filter(contract -> matches(contract.getGroundHandlerId(), supplierFilter))
                .filter(contract -> matches(contract.getAirportCode(), airportFilter))
                .filter(contract -> !contract.getEndDate().isBefore(today))
                .filter(contract -> !contract.getEndDate().isAfter(horizon))
                .filter(this::isDimensionallyPermitted)
                .filter(contract -> serviceFilter == null || safeServices(contract).stream()
                        .anyMatch(service -> matches(service.getChargeCode(), serviceFilter)))
                .toList();

        Set<String> airportCodes = matchingContracts.stream()
                .map(Contract::getAirportCode)
                .collect(Collectors.toSet());
        Map<String, Airport> airportByCode = airportRepository.findAllById(airportCodes).stream()
                .collect(Collectors.toMap(Airport::getIataCode, Function.identity()));
        List<ExpiringContract> contracts = matchingContracts.stream()
                .map(contract -> toContract(contract, airportByCode.get(contract.getAirportCode()), today))
                .sorted(Comparator.comparingLong(ExpiringContract::getDaysRemaining)
                        .thenComparing(ExpiringContract::getAirportCode)
                        .thenComparing(ExpiringContract::getSupplierId))
                .toList();
        List<AirportExpiryPoint> airports = contracts.stream()
                .collect(Collectors.groupingBy(ExpiringContract::getAirportCode))
                .entrySet().stream()
                .map(entry -> toAirportPoint(
                        entry.getKey(), entry.getValue(), airportByCode.get(entry.getKey())))
                .filter(point -> point.getLatitude() != null && point.getLongitude() != null)
                .sorted(Comparator.comparingLong(AirportExpiryPoint::getNearestExpiryDays)
                        .thenComparing(AirportExpiryPoint::getAirportCode))
                .toList();

        return AirlineContractExpiryResponse.builder()
                .asOfDate(today)
                .horizonDays(horizonDays)
                .summary(summary(contracts))
                .airports(airports)
                .contracts(contracts)
                .build();
    }

    private ExpiringContract toContract(Contract contract, Airport airport, LocalDate today) {
        long daysRemaining = ChronoUnit.DAYS.between(today, contract.getEndDate());
        return ExpiringContract.builder()
                .contractId(contract.getId())
                .supplierId(contract.getGroundHandlerId())
                .airportCode(contract.getAirportCode())
                .airportName(airport == null ? contract.getAirportCode() : airport.getName())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .daysRemaining(daysRemaining)
                .urgency(urgency(daysRemaining))
                .currency(contract.getCurrency())
                .serviceTypes(safeServices(contract).stream()
                        .map(ServiceConfiguration::getChargeCode)
                        .collect(Collectors.toCollection(LinkedHashSet::new)))
                .build();
    }

    private AirportExpiryPoint toAirportPoint(
            String airportCode,
            List<ExpiringContract> contracts,
            Airport airport) {
        return AirportExpiryPoint.builder()
                .airportCode(airportCode)
                .airportName(airport == null ? airportCode : airport.getName())
                .city(airport == null ? null : airport.getCity())
                .country(airport == null ? null : airport.getCountry())
                .region(airport == null ? null : airport.getRegion())
                .latitude(airport == null ? null : airport.getLatitude())
                .longitude(airport == null ? null : airport.getLongitude())
                .contractCount(contracts.size())
                .nearestExpiryDays(contracts.stream()
                        .mapToLong(ExpiringContract::getDaysRemaining).min().orElse(0))
                .suppliers(contracts.stream()
                        .map(ExpiringContract::getSupplierId)
                        .sorted()
                        .collect(Collectors.toCollection(LinkedHashSet::new)))
                .serviceTypes(contracts.stream()
                        .flatMap(contract -> contract.getServiceTypes().stream())
                        .sorted()
                        .collect(Collectors.toCollection(LinkedHashSet::new)))
                .build();
    }

    private Summary summary(List<ExpiringContract> contracts) {
        long within30 = contracts.stream()
                .filter(contract -> contract.getDaysRemaining() <= 30).count();
        long within60 = contracts.stream()
                .filter(contract -> contract.getDaysRemaining() > 30
                        && contract.getDaysRemaining() <= 60).count();
        return Summary.builder()
                .totalContracts(contracts.size())
                .expiringWithin30Days(within30)
                .expiringWithin60Days(within60)
                .expiringAfter60Days(contracts.size() - within30 - within60)
                .airportCount(contracts.stream()
                        .map(ExpiringContract::getAirportCode).distinct().count())
                .build();
    }

    private String urgency(long daysRemaining) {
        if (daysRemaining <= 30) {
            return "URGENT";
        }
        if (daysRemaining <= 60) {
            return "UPCOMING";
        }
        return "MONITOR";
    }

    private boolean isDimensionallyPermitted(Contract contract) {
        if (!dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())
                || !dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())) {
            return false;
        }
        return safeServices(contract).stream()
                .allMatch(service ->
                        dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode()));
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Contract expiry reports are available only to airlines");
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

    private List<ServiceConfiguration> safeServices(Contract contract) {
        return contract.getServices() == null ? List.of() : contract.getServices();
    }

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || filter.equals(normalize(value));
    }

    private AirlineContractExpiryResponse emptyResponse(LocalDate today, int horizonDays) {
        return AirlineContractExpiryResponse.builder()
                .asOfDate(today)
                .horizonDays(horizonDays)
                .summary(Summary.builder()
                        .totalContracts(0)
                        .expiringWithin30Days(0)
                        .expiringWithin60Days(0)
                        .expiringAfter60Days(0)
                        .airportCount(0)
                        .build())
                .airports(List.of())
                .contracts(List.of())
                .build();
    }
}
