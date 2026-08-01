package com.airline.marketintelligence;

import com.airline.domain.ChargeCode;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.MarketIntelligenceRepository;
import com.airline.repository.MarketIntelligenceAggregate;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.AirportCostIndexService;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirportCostIndexServiceTest {

    @Mock
    private MarketIntelligenceRepository marketIntelligenceRepository;
    @Mock
    private ChargeCodeRepository chargeCodeRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirportCostIndexService service;

    @BeforeEach
    void setUp() {
        service = new AirportCostIndexService(marketIntelligenceRepository,
                chargeCodeRepository, tenantContext,
                dimensionalSecurityEvaluator);
        airlineAuthentication("MIS_VIEWER");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publishesOnlyAnonymizedAverageWhenTwoSuppliersContribute() {
        allowAirlineAndDimensions();
        when(chargeCodeRepository.findById("BAGGAGE"))
                .thenReturn(Optional.of(new ChargeCode(
                        "BAGGAGE", "Baggage Handling", "Baggage services")));
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("120.00", 2L)));

        var result = service.getIndex(null, null, null, null, null);

        assertThat(result).singleElement().satisfies(index -> {
            assertThat(index.getAirportCode()).isEqualTo("DXB");
            assertThat(index.getRegion()).isEqualTo("MIDDLE_EAST");
            assertThat(index.getServiceType()).isEqualTo("BAGGAGE");
            assertThat(index.getServiceName()).isEqualTo("Baggage Handling");
            assertThat(index.getAircraftType()).isEqualTo("A380");
            assertThat(index.getOperationType()).isEqualTo("INTERNATIONAL");
            assertThat(index.getCurrency()).isEqualTo("USD");
            assertThat(index.getAverageCost()).isEqualByComparingTo("120.00");
            assertThat(index.getObservationCount()).isEqualTo(2);
            assertThat(index.toString()).doesNotContain("SUPPLIER-A", "SUPPLIER-B");
        });
    }

    @Test
    void returnsNoSegmentWhenDatabaseAnonymizationBoundarySuppressesIt() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK")).thenReturn(List.of());

        assertThat(service.getIndex(null, null, null, null, null)).isEmpty();
        verify(chargeCodeRepository, never()).findById("BAGGAGE");
    }

    @Test
    void appliesAirportAndChargeCodeAbacBeforeAggregation() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(false);
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("120.00", 2L)));

        assertThat(service.getIndex(null, null, null, null, null)).isEmpty();
        verify(dimensionalSecurityEvaluator, never()).isChargeCodePermitted("BAGGAGE");
    }

    @Test
    void honorsAllRequestedDimensions() {
        allowAirlineAndDimensions();
        when(chargeCodeRepository.findById("BAGGAGE"))
                .thenReturn(Optional.of(new ChargeCode(
                        "BAGGAGE", "Baggage Handling", "Baggage services")));
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("120.00", 2L)));

        assertThat(service.getIndex(
                "dxb", "middle_east", "baggage", "a380", "international"))
                .hasSize(1);
        assertThat(service.getIndex(
                "dxb", "middle_east", "baggage", "b777", "international"))
                .isEmpty();
    }

    @Test
    void deniesSuppliersAndAirlinesWithoutMisViewerBeforeGlobalRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        assertThatThrownBy(() -> service.getIndex(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(marketIntelligenceRepository, never()).findAnonymizedAggregates("EK");

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        airlineAuthentication("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getIndex(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(marketIntelligenceRepository, never()).findAnonymizedAggregates("EK");
    }

    private void allowAirlineAndDimensions() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
    }

    private MarketIntelligenceAggregate aggregate(String average, long count) {
        return new TestAggregate(new BigDecimal(average), count);
    }

    private static final class TestAggregate implements MarketIntelligenceAggregate {
        private final BigDecimal average;
        private final long count;

        private TestAggregate(BigDecimal average, long count) {
            this.average = average;
            this.count = count;
        }

        public String getAirportCode() { return "DXB"; }
        public String getAirportName() { return "Dubai International Airport"; }
        public String getRegion() { return "MIDDLE_EAST"; }
        public String getServiceType() { return "BAGGAGE"; }
        public String getAircraftType() { return "A380"; }
        public String getOperationType() { return "INTERNATIONAL"; }
        public String getCurrency() { return "USD"; }
        public BigDecimal getAverageCost() { return average; }
        public Long getObservationCount() { return count; }
        public BigDecimal getAirlineAverageCost() { return average; }
        public Long getAirlineObservationCount() { return count; }
        public BigDecimal getLowerQuartile() { return average; }
        public BigDecimal getUpperQuartile() { return average; }
    }

    private void airlineAuthentication(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
