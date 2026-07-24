package com.airline.reports;

import com.airline.domain.Airport;
import com.airline.domain.BillingFrequency;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.AirportRepository;
import com.airline.repository.ContractRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.SupplierOperationalFootprintService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupplierOperationalFootprintServiceTest {

    @Mock private ContractRepository contractRepository;
    @Mock private AirportRepository airportRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private SupplierOperationalFootprintService service;

    @BeforeEach
    void setUp() {
        service = new SupplierOperationalFootprintService(
                contractRepository, airportRepository, tenantContext,
                dimensionalSecurityEvaluator);
        authenticate("MIS_VIEWER");
        lenient().when(dimensionalSecurityEvaluator.isAirportPermitted(anyString())).thenReturn(true);
        lenient().when(dimensionalSecurityEvaluator.isAirlinePermitted(anyString())).thenReturn(true);
        lenient().when(dimensionalSecurityEvaluator.isChargeCodePermitted(anyString())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void mapsOnlyCurrentTenantContractsAcrossAirlinesAirportsAndServices() {
        stubSupplierTenant();
        LocalDate today = LocalDate.now();
        Contract dxb = contract("dxb", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags", "BAGGAGE", BillingFrequency.DAILY, "10"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "100"));
        Contract lhr = contract("lhr", "SUPPLIER-A", "BA", "LHR",
                today.minusMonths(2), today.plusMonths(2), "EUR",
                service("ramp", "RAMP_HANDLING", BillingFrequency.QUARTERLY, "300"));
        Contract future = contract("future", "SUPPLIER-A", "EK", "FRA",
                today.plusDays(1), today.plusMonths(2), "USD",
                service("future-ramp", "RAMP_HANDLING", BillingFrequency.MONTHLY, "500"));
        Contract otherSupplier = contract("other", "SUPPLIER-B", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("other-bags", "BAGGAGE", BillingFrequency.MONTHLY, "900"));
        when(contractRepository.findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER-A", ContractStatus.APPROVED))
                .thenReturn(List.of(dxb, lhr, future, otherSupplier));
        when(airportRepository.findAllById(any())).thenReturn(List.of(
                airport("DXB", "25.249790", "55.370992"),
                airport("LHR", "51.470748", "-0.459909")));

        var result = service.getOperationalFootprint(null, null, null, null);

        assertThat(result.getSummary().getAirportCount()).isEqualTo(2);
        assertThat(result.getSummary().getAirlineCount()).isEqualTo(2);
        assertThat(result.getSummary().getServiceCount()).isEqualTo(3);
        assertThat(result.getSummary().getActiveContractCount()).isEqualTo(2);
        assertThat(result.getAirports()).filteredOn(point -> "DXB".equals(point.getAirportCode()))
                .singleElement().satisfies(point -> {
                    assertThat(point.getAirlines()).containsExactly("EK");
                    assertThat(point.getServiceTypes()).containsExactly("BAGGAGE", "CLEANING");
                    assertThat(point.getMonthlyValues()).singleElement()
                            .satisfies(value -> assertThat(value.getMonthlyExpectedValue())
                                    .isEqualByComparingTo("400.00"));
                });
        assertThat(result.getAirports()).filteredOn(point -> "LHR".equals(point.getAirportCode()))
                .singleElement().satisfies(point -> assertThat(point.getMonthlyValues())
                        .singleElement().satisfies(value ->
                                assertThat(value.getMonthlyExpectedValue())
                                        .isEqualByComparingTo("100.00")));
        verify(contractRepository).findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER-A", ContractStatus.APPROVED);
    }

    @Test
    void appliesAirlineAirportServiceAndCurrencyFilters() {
        stubSupplierTenant();
        LocalDate today = LocalDate.now();
        Contract contract = contract("dxb", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags", "BAGGAGE", BillingFrequency.MONTHLY, "75"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "25"));
        when(contractRepository.findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER-A", ContractStatus.APPROVED)).thenReturn(List.of(contract));
        when(airportRepository.findAllById(any())).thenReturn(List.of(
                airport("DXB", "25.249790", "55.370992")));

        var result = service.getOperationalFootprint(
                "ek", "dxb", "baggage", "usd");

        assertThat(result.getContracts()).singleElement().satisfies(detail ->
                assertThat(detail.getServices()).singleElement().satisfies(item -> {
                    assertThat(item.getServiceType()).isEqualTo("BAGGAGE");
                    assertThat(item.getMonthlyExpectedValue()).isEqualByComparingTo("75.00");
                }));
        assertThat(result.getAirports()).singleElement()
                .satisfies(point -> assertThat(point.getServiceTypes())
                        .containsExactly("BAGGAGE"));
    }

    @Test
    void dimensionalDenialFailsClosedForMixedServiceContract() {
        stubSupplierTenant();
        LocalDate today = LocalDate.now();
        Contract mixed = contract("mixed", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags", "BAGGAGE", BillingFrequency.MONTHLY, "75"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "25"));
        when(contractRepository.findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER-A", ContractStatus.APPROVED)).thenReturn(List.of(mixed));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);
        when(airportRepository.findAllById(any())).thenReturn(List.of());

        assertThat(service.getOperationalFootprint(
                null, null, "BAGGAGE", null).getContracts()).isEmpty();
    }

    @Test
    void deniesAirlinesAndMissingMisViewerBeforeRepositoryRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        assertThatThrownBy(() -> service.getOperationalFootprint(
                null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to ground handlers");
        verify(contractRepository, never())
                .findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(anyString(), any());

        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getOperationalFootprint(
                null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(contractRepository, never())
                .findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(anyString(), any());
    }

    private void stubSupplierTenant() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SUPPLIER-A");
    }

    private Contract contract(
            String id, String supplier, String airline, String airport,
            LocalDate start, LocalDate end, String currency,
            ServiceConfiguration... services) {
        Contract contract = Contract.builder().id(id).groundHandlerId(supplier)
                .airlineId(airline).airportCode(airport).startDate(start).endDate(end)
                .status(ContractStatus.APPROVED).currency(currency)
                .services(List.of(services)).build();
        for (ServiceConfiguration service : services) {
            service.setContract(contract);
        }
        return contract;
    }

    private ServiceConfiguration service(
            String id, String code, BillingFrequency frequency, String expected) {
        return ServiceConfiguration.builder().id(id).chargeCode(code).serviceName(code)
                .billingFrequency(frequency)
                .rateDetails(Map.of("expectedAmount", new BigDecimal(expected))).build();
    }

    private Airport airport(String code, String latitude, String longitude) {
        return new Airport(code, code + " Airport", "City", "Country", "REGION",
                new BigDecimal(latitude), new BigDecimal(longitude));
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("supplier-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
