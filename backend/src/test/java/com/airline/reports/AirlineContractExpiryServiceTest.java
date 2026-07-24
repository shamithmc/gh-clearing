package com.airline.reports;

import com.airline.domain.Airport;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.AirportRepository;
import com.airline.repository.ContractRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.AirlineContractExpiryService;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirlineContractExpiryServiceTest {

    @Mock private ContractRepository contractRepository;
    @Mock private AirportRepository airportRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirlineContractExpiryService service;

    @BeforeEach
    void setUp() {
        service = new AirlineContractExpiryService(
                contractRepository, airportRepository, tenantContext, dimensionalSecurityEvaluator);
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
    void returnsApprovedTenantContractsByUrgencyWithGeographicAirportPoints() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract urgent = contract("urgent", "SUPPLIER-A", "EK", "DXB", today.plusDays(10),
                service("BAGGAGE"));
        Contract upcoming = contract("upcoming", "SUPPLIER-B", "EK", "LHR", today.plusDays(45),
                service("CLEANING"));
        Contract monitor = contract("monitor", "SUPPLIER-A", "EK", "DXB", today.plusDays(75),
                service("RAMP_HANDLING"));
        Contract expired = contract("expired", "SUPPLIER-A", "EK", "DXB", today.minusDays(1),
                service("BAGGAGE"));
        Contract tooFar = contract("far", "SUPPLIER-A", "EK", "DXB", today.plusDays(100),
                service("BAGGAGE"));
        Contract crossAirline = contract("other", "SUPPLIER-A", "LH", "DXB", today.plusDays(5),
                service("BAGGAGE"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED))
                .thenReturn(List.of(urgent, upcoming, monitor, expired, tooFar, crossAirline));
        when(airportRepository.findAllById(any())).thenReturn(List.of(
                airport("DXB", "Dubai", "UAE", "MIDDLE_EAST", "25.249790", "55.370992"),
                airport("LHR", "London", "United Kingdom", "EUROPE", "51.470748", "-0.459909")));

        var result = service.getContractExpiry(null, null, null, 90);

        assertThat(result.getSummary().getTotalContracts()).isEqualTo(3);
        assertThat(result.getSummary().getExpiringWithin30Days()).isEqualTo(1);
        assertThat(result.getSummary().getExpiringWithin60Days()).isEqualTo(1);
        assertThat(result.getSummary().getExpiringAfter60Days()).isEqualTo(1);
        assertThat(result.getSummary().getAirportCount()).isEqualTo(2);
        assertThat(result.getContracts())
                .extracting(contract -> contract.getContractId())
                .containsExactly("urgent", "upcoming", "monitor");
        assertThat(result.getContracts())
                .extracting(contract -> contract.getUrgency())
                .containsExactly("URGENT", "UPCOMING", "MONITOR");
        assertThat(result.getAirports()).filteredOn(point -> "DXB".equals(point.getAirportCode()))
                .singleElement().satisfies(point -> {
                    assertThat(point.getContractCount()).isEqualTo(2);
                    assertThat(point.getNearestExpiryDays()).isEqualTo(10);
                    assertThat(point.getLatitude()).isEqualByComparingTo("25.249790");
                    assertThat(point.getSuppliers()).containsExactly("SUPPLIER-A");
                    assertThat(point.getServiceTypes()).containsExactly(
                            "BAGGAGE", "RAMP_HANDLING");
                });
    }

    @Test
    void filtersBySupplierAirportAndService() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract baggage = contract("bags", "SUPPLIER-A", "EK", "DXB", today.plusDays(20),
                service("BAGGAGE"), service("CLEANING"));
        Contract otherSupplier = contract("other", "SUPPLIER-B", "EK", "DXB", today.plusDays(20),
                service("BAGGAGE"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(baggage, otherSupplier));
        when(airportRepository.findAllById(any())).thenReturn(List.of(
                airport("DXB", "Dubai", "UAE", "MIDDLE_EAST", "25.249790", "55.370992")));

        var result = service.getContractExpiry(
                "supplier-a", "dxb", "cleaning", 30);

        assertThat(result.getContracts()).singleElement().satisfies(contract -> {
            assertThat(contract.getContractId()).isEqualTo("bags");
            assertThat(contract.getServiceTypes()).containsExactly("BAGGAGE", "CLEANING");
        });
    }

    @Test
    void dimensionalDenialFailsClosedForMixedServiceContract() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract mixed = contract("mixed", "SUPPLIER-A", "EK", "DXB", today.plusDays(10),
                service("BAGGAGE"), service("CLEANING"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(mixed));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);

        var result = service.getContractExpiry(null, null, "BAGGAGE", 30);

        assertThat(result.getContracts()).isEmpty();
        verify(airportRepository).findAllById(any());
    }

    @Test
    void validatesHorizonBeforeReadingContracts() {
        stubAirlineTenant();

        assertThatThrownBy(() -> service.getContractExpiry(null, null, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 365");
        assertThatThrownBy(() -> service.getContractExpiry(null, null, null, 366))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 365");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());
    }

    @Test
    void deniesNonAirlinesAndMissingMisViewerBeforeTenantRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        assertThatThrownBy(() -> service.getContractExpiry(null, null, null, 90))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getContractExpiry(null, null, null, 90))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());
    }

    private void stubAirlineTenant() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
    }

    private Contract contract(
            String id,
            String supplier,
            String airline,
            String airport,
            LocalDate endDate,
            ServiceConfiguration... services) {
        Contract contract = Contract.builder()
                .id(id)
                .groundHandlerId(supplier)
                .airlineId(airline)
                .airportCode(airport)
                .startDate(endDate.minusYears(1))
                .endDate(endDate)
                .status(ContractStatus.APPROVED)
                .currency("USD")
                .services(List.of(services))
                .build();
        for (ServiceConfiguration service : services) {
            service.setContract(contract);
        }
        return contract;
    }

    private ServiceConfiguration service(String chargeCode) {
        return ServiceConfiguration.builder()
                .id(chargeCode)
                .chargeCode(chargeCode)
                .serviceName(chargeCode)
                .build();
    }

    private Airport airport(
            String code,
            String city,
            String country,
            String region,
            String latitude,
            String longitude) {
        return new Airport(
                code, code + " Airport", city, country, region,
                new BigDecimal(latitude), new BigDecimal(longitude));
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
