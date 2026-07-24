package com.airline.service;

import com.airline.api.dto.SupplierOperationalFootprintResponse;
import com.airline.api.dto.SupplierOperationalFootprintResponse.AirportOperation;
import com.airline.api.dto.SupplierOperationalFootprintResponse.ContractOperation;
import com.airline.api.dto.SupplierOperationalFootprintResponse.CurrencyValue;
import com.airline.api.dto.SupplierOperationalFootprintResponse.ServiceOperation;
import com.airline.api.dto.SupplierOperationalFootprintResponse.Summary;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SupplierOperationalFootprintService {

    private final ContractRepository contractRepository;
    private final AirportRepository airportRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public SupplierOperationalFootprintService(
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
    public SupplierOperationalFootprintResponse getOperationalFootprint(
            String airlineId,
            String airportCode,
            String serviceType,
            String currency) {
        String supplierId = requireSupplierMisViewer();
        String airlineFilter = normalize(airlineId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        String currencyFilter = normalize(currency);
        LocalDate today = LocalDate.now();
        List<Contract> contracts = contractRepository
                .findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                        supplierId, ContractStatus.APPROVED).stream()
                .filter(contract -> supplierId.equals(contract.getGroundHandlerId()))
                .filter(contract -> !contract.getStartDate().isAfter(today))
                .filter(contract -> !contract.getEndDate().isBefore(today))
                .filter(contract -> matches(contract.getAirlineId(), airlineFilter))
                .filter(contract -> matches(contract.getAirportCode(), airportFilter))
                .filter(contract -> matches(contract.getCurrency(), currencyFilter))
                .filter(this::isDimensionallyPermitted)
                .filter(contract -> serviceFilter == null || safeServices(contract).stream()
                        .anyMatch(service -> matches(service.getChargeCode(), serviceFilter)))
                .toList();

        Set<String> airportCodes = contracts.stream()
                .map(Contract::getAirportCode).collect(Collectors.toSet());
        Map<String, Airport> airportByCode = airportRepository.findAllById(airportCodes).stream()
                .collect(Collectors.toMap(Airport::getIataCode, Function.identity()));
        List<ContractOperation> details = contracts.stream()
                .map(contract -> toContract(contract, serviceFilter))
                .sorted(Comparator.comparing(ContractOperation::getAirportCode)
                        .thenComparing(ContractOperation::getAirlineId)
                        .thenComparing(ContractOperation::getContractId))
                .toList();
        List<AirportOperation> airports = contracts.stream()
                .collect(Collectors.groupingBy(Contract::getAirportCode))
                .entrySet().stream()
                .map(entry -> toAirport(
                        entry.getKey(), entry.getValue(),
                        airportByCode.get(entry.getKey()), serviceFilter))
                .filter(point -> point.getLatitude() != null && point.getLongitude() != null)
                .sorted(Comparator.comparing(AirportOperation::getAirportCode))
                .toList();

        return SupplierOperationalFootprintResponse.builder()
                .asOfDate(today)
                .summary(Summary.builder()
                        .airportCount(airports.size())
                        .airlineCount(contracts.stream()
                                .map(Contract::getAirlineId).distinct().count())
                        .serviceCount(details.stream()
                                .flatMap(contract -> contract.getServices().stream())
                                .map(ServiceOperation::getServiceType).distinct().count())
                        .activeContractCount(contracts.size())
                        .build())
                .airports(airports)
                .contracts(details)
                .build();
    }

    private AirportOperation toAirport(
            String code,
            List<Contract> contracts,
            Airport airport,
            String serviceFilter) {
        Map<String, BigDecimal> currencyValues = new HashMap<>();
        contracts.forEach(contract -> filteredServices(contract, serviceFilter).forEach(service ->
                currencyValues.merge(
                        contract.getCurrency(), monthlyValue(service), BigDecimal::add)));
        return AirportOperation.builder()
                .airportCode(code)
                .airportName(airport == null ? code : airport.getName())
                .city(airport == null ? null : airport.getCity())
                .country(airport == null ? null : airport.getCountry())
                .region(airport == null ? null : airport.getRegion())
                .latitude(airport == null ? null : airport.getLatitude())
                .longitude(airport == null ? null : airport.getLongitude())
                .airlines(sortedSet(contracts.stream().map(Contract::getAirlineId).toList()))
                .serviceTypes(sortedSet(contracts.stream()
                        .flatMap(contract -> filteredServices(contract, serviceFilter).stream())
                        .map(ServiceConfiguration::getChargeCode).toList()))
                .monthlyValues(currencyValues.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> CurrencyValue.builder()
                                .currency(entry.getKey())
                                .monthlyExpectedValue(scale(entry.getValue()))
                                .build())
                        .toList())
                .contractCount(contracts.size())
                .build();
    }

    private ContractOperation toContract(Contract contract, String serviceFilter) {
        return ContractOperation.builder()
                .contractId(contract.getId())
                .airlineId(contract.getAirlineId())
                .airportCode(contract.getAirportCode())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .currency(contract.getCurrency())
                .services(filteredServices(contract, serviceFilter).stream()
                        .map(service -> ServiceOperation.builder()
                                .serviceId(service.getId())
                                .serviceType(service.getChargeCode())
                                .serviceName(service.getServiceName())
                                .billingFrequency(service.getBillingFrequency() == null
                                        ? null : service.getBillingFrequency().name())
                                .monthlyExpectedValue(scale(monthlyValue(service)))
                                .build())
                        .toList())
                .build();
    }

    private BigDecimal monthlyValue(ServiceConfiguration service) {
        if (service.getBillingFrequency() == null || service.getRateDetails() == null
                || service.getRateDetails().get("expectedAmount") == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal expected;
        try {
            expected = new BigDecimal(service.getRateDetails().get("expectedAmount").toString());
        } catch (NumberFormatException ignored) {
            return BigDecimal.ZERO;
        }
        if (expected.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return switch (service.getBillingFrequency()) {
            case DAILY -> expected.multiply(BigDecimal.valueOf(30));
            case WEEKLY -> expected.multiply(BigDecimal.valueOf(52))
                    .divide(BigDecimal.valueOf(12), 8, RoundingMode.HALF_UP);
            case MONTHLY -> expected;
            case QUARTERLY -> expected.divide(
                    BigDecimal.valueOf(3), 8, RoundingMode.HALF_UP);
        };
    }

    private boolean isDimensionallyPermitted(Contract contract) {
        return dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())
                && dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())
                && safeServices(contract).stream().allMatch(service ->
                dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode()));
    }

    private String requireSupplierMisViewer() {
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException(
                    "Operational footprint reports are available only to ground handlers");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null && authentication.isAuthenticated()
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

    private List<ServiceConfiguration> filteredServices(Contract contract, String filter) {
        return safeServices(contract).stream()
                .filter(service -> matches(service.getChargeCode(), filter)).toList();
    }

    private LinkedHashSet<String> sortedSet(List<String> values) {
        return values.stream().sorted()
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalize(String value) {
        return value == null || value.isBlank()
                ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean matches(String value, String filter) {
        return filter == null || filter.equals(normalize(value));
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
