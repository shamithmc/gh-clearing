package com.airline.reports;

import com.airline.domain.BillingFrequency;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.AirlineExpectedBillingService;
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
class AirlineExpectedBillingServiceTest {

    @Mock private ContractRepository contractRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirlineExpectedBillingService service;

    @BeforeEach
    void setUp() {
        service = new AirlineExpectedBillingService(
                contractRepository, tenantContext, dimensionalSecurityEvaluator);
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
    void projectsApprovedServicesFromContractAnchoredFrequencyAndKeepsCurrenciesSeparate() {
        stubAirlineTenant();
        Contract monthly = contract(
                "monthly", "SUPPLIER-A", "EK", "DXB", "USD",
                LocalDate.of(2026, 1, 31), LocalDate.of(2026, 4, 30),
                service("monthly-bags", "BAGGAGE", BillingFrequency.MONTHLY, "125.50"));
        Contract weekly = contract(
                "weekly", "SUPPLIER-B", "EK", "LHR", "EUR",
                LocalDate.of(2026, 2, 2), LocalDate.of(2026, 3, 31),
                service("weekly-clean", "CLEANING", BillingFrequency.WEEKLY, "40.00"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(monthly, weekly));

        var result = service.getExpectedBilling(
                null, null, null,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 31));

        assertThat(result.getSummaries())
                .extracting(summary -> summary.getCurrency())
                .containsExactly("EUR", "USD");
        assertThat(result.getSummaries()).filteredOn(summary -> "USD".equals(summary.getCurrency()))
                .singleElement().satisfies(summary -> {
                    assertThat(summary.getTotalExpected()).isEqualByComparingTo("251.00");
                    assertThat(summary.getOccurrenceCount()).isEqualTo(2);
                });
        assertThat(result.getTimeline()).filteredOn(point -> "USD".equals(point.getCurrency()))
                .extracting(point -> point.getDate())
                .containsExactly(LocalDate.of(2026, 2, 28), LocalDate.of(2026, 3, 31));
        assertThat(result.getProjections()).hasSize(11);
        assertThat(result.getBySupplier())
                .extracting(group -> group.getKey())
                .containsExactlyInAnyOrder("SUPPLIER-A", "SUPPLIER-B");
        verify(contractRepository).findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED);
    }

    @Test
    void appliesSupplierAirportAndServiceFiltersToEveryProjection() {
        stubAirlineTenant();
        Contract contract = contract(
                "filtered", "SUPPLIER-A", "EK", "DXB", "USD",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 3),
                service("bags", "BAGGAGE", BillingFrequency.DAILY, "10.00"),
                service("clean", "CLEANING", BillingFrequency.DAILY, "5.00"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(contract));

        var result = service.getExpectedBilling(
                "supplier-a", "dxb", "baggage",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 3));

        assertThat(result.getSummaries()).singleElement().satisfies(summary -> {
            assertThat(summary.getTotalExpected()).isEqualByComparingTo("30.00");
            assertThat(summary.getOccurrenceCount()).isEqualTo(3);
        });
        assertThat(result.getByService()).singleElement()
                .satisfies(group -> assertThat(group.getKey()).isEqualTo("BAGGAGE"));
        assertThat(result.getProjections())
                .allSatisfy(projection -> {
                    assertThat(projection.getSupplierId()).isEqualTo("SUPPLIER-A");
                    assertThat(projection.getAirportCode()).isEqualTo("DXB");
                    assertThat(projection.getServiceType()).isEqualTo("BAGGAGE");
                });
    }

    @Test
    void skipsUnconfiguredServicesRatherThanGuessingExpectedAmounts() {
        stubAirlineTenant();
        ServiceConfiguration noFrequency = service(
                "no-frequency", "BAGGAGE", null, "20.00");
        ServiceConfiguration noExpectedAmount = ServiceConfiguration.builder()
                .id("no-amount")
                .chargeCode("CLEANING")
                .serviceName("CLEANING")
                .billingFrequency(BillingFrequency.MONTHLY)
                .rateDetails(Map.of("rate", 10))
                .build();
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(contract(
                        "unconfigured", "SUPPLIER-A", "EK", "DXB", "USD",
                        LocalDate.of(2026, 7, 1), LocalDate.of(2026, 9, 1),
                        noFrequency, noExpectedAmount)));

        assertThat(service.getExpectedBilling(
                null, null, null,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 9, 1))
                .getProjections()).isEmpty();
    }

    @Test
    void dimensionalDenialFailsClosedForMixedServiceContract() {
        stubAirlineTenant();
        Contract mixed = contract(
                "mixed", "SUPPLIER-A", "EK", "DXB", "USD",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 2),
                service("bags", "BAGGAGE", BillingFrequency.DAILY, "10.00"),
                service("clean", "CLEANING", BillingFrequency.DAILY, "5.00"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(mixed));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);

        assertThat(service.getExpectedBilling(
                null, null, "BAGGAGE",
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 2))
                .getProjections()).isEmpty();
    }

    @Test
    void rejectsInvalidDateRangeBeforeReadingContracts() {
        stubAirlineTenant();

        assertThatThrownBy(() -> service.getExpectedBilling(
                null, null, null,
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 7, 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Start date");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());

        assertThatThrownBy(() -> service.getExpectedBilling(
                null, null, null,
                LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 3)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("366 days");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());
    }

    @Test
    void deniesNonAirlinesAndMissingMisViewerBeforeTenantRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        assertThatThrownBy(() -> service.getExpectedBilling(
                null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getExpectedBilling(
                null, null, null, null, null))
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
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            ServiceConfiguration... services) {
        Contract contract = Contract.builder()
                .id(id)
                .groundHandlerId(supplier)
                .airlineId(airline)
                .airportCode(airport)
                .currency(currency)
                .startDate(startDate)
                .endDate(endDate)
                .status(ContractStatus.APPROVED)
                .services(List.of(services))
                .build();
        for (ServiceConfiguration service : services) {
            service.setContract(contract);
        }
        return contract;
    }

    private ServiceConfiguration service(
            String id,
            String chargeCode,
            BillingFrequency frequency,
            String expectedAmount) {
        return ServiceConfiguration.builder()
                .id(id)
                .chargeCode(chargeCode)
                .serviceName(chargeCode)
                .billingFrequency(frequency)
                .rateDetails(Map.of("expectedAmount", new BigDecimal(expectedAmount)))
                .build();
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
