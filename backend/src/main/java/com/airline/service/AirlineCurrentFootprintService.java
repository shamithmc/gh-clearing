package com.airline.service;

import com.airline.api.dto.AirlineCurrentFootprintResponse;
import com.airline.api.dto.AirlineCurrentFootprintResponse.AirportFootprint;
import com.airline.api.dto.AirlineCurrentFootprintResponse.ContractDrilldown;
import com.airline.api.dto.AirlineCurrentFootprintResponse.CurrencyMetric;
import com.airline.api.dto.AirlineCurrentFootprintResponse.InvoiceSummary;
import com.airline.api.dto.AirlineCurrentFootprintResponse.ServiceRate;
import com.airline.api.dto.AirlineCurrentFootprintResponse.Summary;
import com.airline.domain.Airport;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.AirportRepository;
import com.airline.repository.ContractRepository;
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
public class AirlineCurrentFootprintService {

    private static final Set<InvoiceStatus> DISPATCHED_STATUSES =
            Set.of(InvoiceStatus.SENT, InvoiceStatus.DISPUTED, InvoiceStatus.PAID);

    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final AirportRepository airportRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public AirlineCurrentFootprintService(
            ContractRepository contractRepository,
            InvoiceRepository invoiceRepository,
            AirportRepository airportRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.airportRepository = airportRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public AirlineCurrentFootprintResponse getCurrentFootprint(
            String supplierId,
            String airportCode,
            String serviceType,
            String currency,
            int historyMonths) {
        String airlineId = requireAirlineMisViewer();
        if (historyMonths < 1 || historyMonths > 24) {
            throw new IllegalArgumentException("Invoice history must be between 1 and 24 months");
        }
        LocalDate today = LocalDate.now();
        LocalDate invoicedFrom = today.minusMonths(historyMonths);
        if (!dimensionalSecurityEvaluator.isAirlinePermitted(airlineId)) {
            return emptyResponse(today, invoicedFrom);
        }

        String supplierFilter = normalize(supplierId);
        String airportFilter = normalize(airportCode);
        String serviceFilter = normalize(serviceType);
        String currencyFilter = normalize(currency);
        List<Contract> contracts = contractRepository
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(
                        airlineId, ContractStatus.APPROVED).stream()
                .filter(contract -> airlineId.equals(contract.getAirlineId()))
                .filter(contract -> !contract.getStartDate().isAfter(today))
                .filter(contract -> !contract.getEndDate().isBefore(today))
                .filter(contract -> matches(contract.getGroundHandlerId(), supplierFilter))
                .filter(contract -> matches(contract.getAirportCode(), airportFilter))
                .filter(contract -> matches(contract.getCurrency(), currencyFilter))
                .filter(this::isContractPermitted)
                .filter(contract -> serviceFilter == null || safeServices(contract).stream()
                        .anyMatch(service -> matches(service.getChargeCode(), serviceFilter)))
                .toList();

        Set<FootprintKey> activePairs = contracts.stream()
                .map(contract -> new FootprintKey(
                        contract.getGroundHandlerId(), contract.getAirportCode()))
                .collect(Collectors.toSet());
        List<InvoiceData> invoices = invoiceRepository.findAllByTenantId(airlineId).stream()
                .filter(invoice -> airlineId.equals(invoice.getAirlineId()))
                .filter(invoice -> DISPATCHED_STATUSES.contains(invoice.getStatus()))
                .filter(invoice -> !invoice.getIssueDate().isBefore(invoicedFrom))
                .filter(invoice -> !invoice.getIssueDate().isAfter(today))
                .filter(invoice -> activePairs.contains(
                        new FootprintKey(invoice.getSupplierId(), invoice.getAirportCode())))
                .filter(invoice -> matches(invoice.getCurrency(), currencyFilter))
                .filter(this::isInvoicePermitted)
                .map(invoice -> invoiceData(invoice, serviceFilter))
                .filter(data -> data != null)
                .toList();

        Set<String> airportCodes = contracts.stream()
                .map(Contract::getAirportCode)
                .collect(Collectors.toSet());
        Map<String, Airport> airportByCode = airportRepository.findAllById(airportCodes).stream()
                .collect(Collectors.toMap(Airport::getIataCode, Function.identity()));
        List<ContractDrilldown> contractDetails = contracts.stream()
                .map(contract -> toContract(contract, serviceFilter))
                .sorted(Comparator.comparing(ContractDrilldown::getAirportCode)
                        .thenComparing(ContractDrilldown::getSupplierId)
                        .thenComparing(ContractDrilldown::getContractId))
                .toList();
        List<InvoiceSummary> invoiceDetails = invoices.stream()
                .map(InvoiceData::summary)
                .sorted(Comparator.comparing(InvoiceSummary::getIssueDate).reversed()
                        .thenComparing(InvoiceSummary::getInvoiceNumber))
                .toList();
        List<AirportFootprint> airports = buildAirports(
                contracts, invoices, airportByCode, serviceFilter);

        return AirlineCurrentFootprintResponse.builder()
                .asOfDate(today)
                .invoicedFromDate(invoicedFrom)
                .summary(Summary.builder()
                        .airportCount(airports.size())
                        .supplierCount(contracts.stream()
                                .map(Contract::getGroundHandlerId).distinct().count())
                        .serviceCount(contractDetails.stream()
                                .flatMap(contract -> contract.getServices().stream())
                                .map(ServiceRate::getServiceType).distinct().count())
                        .activeContractCount(contracts.size())
                        .dispatchedInvoiceCount(invoices.size())
                        .build())
                .airports(airports)
                .contracts(contractDetails)
                .invoices(invoiceDetails)
                .build();
    }

    private List<AirportFootprint> buildAirports(
            List<Contract> contracts,
            List<InvoiceData> invoices,
            Map<String, Airport> airportByCode,
            String serviceFilter) {
        return contracts.stream().collect(Collectors.groupingBy(Contract::getAirportCode))
                .entrySet().stream()
                .map(entry -> {
                    String code = entry.getKey();
                    List<Contract> airportContracts = entry.getValue();
                    List<InvoiceData> airportInvoices = invoices.stream()
                            .filter(invoice -> code.equals(invoice.summary().getAirportCode()))
                            .toList();
                    Airport airport = airportByCode.get(code);
                    return AirportFootprint.builder()
                            .airportCode(code)
                            .airportName(airport == null ? code : airport.getName())
                            .city(airport == null ? null : airport.getCity())
                            .country(airport == null ? null : airport.getCountry())
                            .region(airport == null ? null : airport.getRegion())
                            .latitude(airport == null ? null : airport.getLatitude())
                            .longitude(airport == null ? null : airport.getLongitude())
                            .suppliers(sortedSet(airportContracts.stream()
                                    .map(Contract::getGroundHandlerId).toList()))
                            .serviceTypes(sortedSet(airportContracts.stream()
                                    .flatMap(contract -> filteredServices(contract, serviceFilter).stream())
                                    .map(ServiceConfiguration::getChargeCode).toList()))
                            .financials(financials(airportContracts, airportInvoices, serviceFilter))
                            .build();
                })
                .filter(point -> point.getLatitude() != null && point.getLongitude() != null)
                .sorted(Comparator.comparing(AirportFootprint::getAirportCode))
                .toList();
    }

    private List<CurrencyMetric> financials(
            List<Contract> contracts,
            List<InvoiceData> invoices,
            String serviceFilter) {
        Map<String, FinancialAccumulator> values = new HashMap<>();
        contracts.forEach(contract -> filteredServices(contract, serviceFilter).forEach(service -> {
            FinancialAccumulator value = values.computeIfAbsent(
                    contract.getCurrency(), ignored -> new FinancialAccumulator());
            value.monthly = value.monthly.add(monthlyValue(service));
        }));
        invoices.forEach(invoice -> {
            FinancialAccumulator value = values.computeIfAbsent(
                    invoice.summary().getCurrency(), ignored -> new FinancialAccumulator());
            value.invoiced = value.invoiced.add(invoice.summary().getInvoicedValue());
            value.invoiceCount++;
        });
        return values.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> CurrencyMetric.builder()
                        .currency(entry.getKey())
                        .monthlyContractValue(scale(entry.getValue().monthly))
                        .invoicedValue(scale(entry.getValue().invoiced))
                        .invoiceCount(entry.getValue().invoiceCount)
                        .build())
                .toList();
    }

    private ContractDrilldown toContract(Contract contract, String serviceFilter) {
        return ContractDrilldown.builder()
                .contractId(contract.getId())
                .supplierId(contract.getGroundHandlerId())
                .airportCode(contract.getAirportCode())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .currency(contract.getCurrency())
                .services(filteredServices(contract, serviceFilter).stream()
                        .map(service -> ServiceRate.builder()
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

    private InvoiceData invoiceData(Invoice invoice, String serviceFilter) {
        List<InvoiceLineItem> matchingLines = safeLines(invoice).stream()
                .filter(line -> matches(line.getChargeCode(), serviceFilter))
                .toList();
        if (serviceFilter != null && matchingLines.isEmpty()) {
            return null;
        }
        BigDecimal value = serviceFilter == null
                ? invoice.getTotalAmount()
                : matchingLines.stream().map(InvoiceLineItem::getCalculatedAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new InvoiceData(InvoiceSummary.builder()
                .invoiceId(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .supplierId(invoice.getSupplierId())
                .airportCode(invoice.getAirportCode())
                .issueDate(invoice.getIssueDate())
                .status(invoice.getStatus().name())
                .currency(invoice.getCurrency())
                .invoicedValue(scale(value))
                .serviceTypes(sortedSet(matchingLines.stream()
                        .map(InvoiceLineItem::getChargeCode).toList()))
                .build());
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

    private boolean isContractPermitted(Contract contract) {
        return dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())
                && dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())
                && safeServices(contract).stream().allMatch(service ->
                dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode()));
    }

    private boolean isInvoicePermitted(Invoice invoice) {
        return dimensionalSecurityEvaluator.isAirportPermitted(invoice.getAirportCode())
                && dimensionalSecurityEvaluator.isAirlinePermitted(invoice.getAirlineId())
                && safeLines(invoice).stream().allMatch(line ->
                dimensionalSecurityEvaluator.isChargeCodePermitted(line.getChargeCode()));
    }

    private String requireAirlineMisViewer() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Current footprint reports are available only to airlines");
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

    private List<InvoiceLineItem> safeLines(Invoice invoice) {
        return invoice.getLineItems() == null ? List.of() : invoice.getLineItems();
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
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private AirlineCurrentFootprintResponse emptyResponse(
            LocalDate today, LocalDate invoicedFrom) {
        return AirlineCurrentFootprintResponse.builder()
                .asOfDate(today)
                .invoicedFromDate(invoicedFrom)
                .summary(Summary.builder().airportCount(0).supplierCount(0)
                        .serviceCount(0).activeContractCount(0)
                        .dispatchedInvoiceCount(0).build())
                .airports(List.of()).contracts(List.of()).invoices(List.of()).build();
    }

    private record FootprintKey(String supplierId, String airportCode) {
    }

    private record InvoiceData(InvoiceSummary summary) {
    }

    private static class FinancialAccumulator {
        private BigDecimal monthly = BigDecimal.ZERO;
        private BigDecimal invoiced = BigDecimal.ZERO;
        private long invoiceCount;
    }
}
