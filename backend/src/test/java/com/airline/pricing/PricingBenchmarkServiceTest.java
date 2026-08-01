package com.airline.pricing;

import com.airline.domain.ChargeCode;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.MarketIntelligenceRepository;
import com.airline.repository.MarketIntelligenceAggregate;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.PricingBenchmarkService;
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
class PricingBenchmarkServiceTest {

    @Mock private MarketIntelligenceRepository marketIntelligenceRepository;
    @Mock private ChargeCodeRepository chargeCodeRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private PricingBenchmarkService service;

    @BeforeEach
    void setUp() {
        service = new PricingBenchmarkService(marketIntelligenceRepository,
                chargeCodeRepository, tenantContext,
                dimensionalSecurityEvaluator);
        authenticate("MIS_VIEWER");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void classifiesOwnRateInUpperQuartileAsPremiumWithoutExposingMarketRates() {
        stubPermittedContext();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("140.00", 1L, "110.00", "130.00")));

        var result = service.getBenchmarks(null, null, null, null, null);

        assertThat(result).singleElement().satisfies(benchmark -> {
            assertThat(benchmark.getMarketPosition()).isEqualTo("TOP_25_PERCENT_PREMIUM");
            assertThat(benchmark.getAirlineAverageCost()).isEqualByComparingTo("140.00");
            assertThat(benchmark.getAirlineObservationCount()).isEqualTo(1);
            assertThat(benchmark.getAircraftType()).isEqualTo("A380");
            assertThat(benchmark.getOperationType()).isEqualTo("INTERNATIONAL");
            assertThat(benchmark.toString())
                    .doesNotContain("SUPPLIER-A", "SUPPLIER-B", "100.00");
        });
    }

    @Test
    void classifiesOwnRateInLowerQuartileAsDiscount() {
        stubPermittedContext();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("100.00", 1L, "110.00", "130.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("BOTTOM_25_PERCENT_DISCOUNT");
    }

    @Test
    void classifiesOwnRateBetweenQuartilesAsMidMarket() {
        stubPermittedContext();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("120.00", 1L, "110.00", "130.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("MID_50_PERCENT");
    }

    @Test
    void equalMarketRatesAreMidMarketRatherThanArtificiallyPremium() {
        stubPermittedContext();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("120.00", 1L, "120.00", "120.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("MID_50_PERCENT");
    }

    @Test
    void suppressesBenchmarksWithoutEligibleDatabaseGroupOrOwnAirlineObservations() {
        stubPermittedContextWithoutVocabulary();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK")).thenReturn(List.of());

        assertThat(service.getBenchmarks(null, null, null, null, null)).isEmpty();
        verify(chargeCodeRepository, never()).findById("BAGGAGE");

        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate(null, 0L, "110.00", "130.00")));
        assertThat(service.getBenchmarks(null, null, null, null, null)).isEmpty();
    }

    @Test
    void appliesRequestedDimensionsAndAbacBeforeClassifying() {
        stubPermittedContext();
        when(marketIntelligenceRepository.findAnonymizedAggregates("EK"))
                .thenReturn(List.of(aggregate("140.00", 1L, "110.00", "130.00")));

        assertThat(service.getBenchmarks(
                "dxb", "middle_east", "baggage", "a380", "international"))
                .hasSize(1);
        assertThat(service.getBenchmarks(
                "dxb", "middle_east", "baggage", "b777", "international"))
                .isEmpty();

        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(false);
        assertThat(service.getBenchmarks(null, null, null, null, null)).isEmpty();
    }

    @Test
    void deniesNonAirlinesAndMissingMisViewerBeforeGlobalRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        assertThatThrownBy(() -> service.getBenchmarks(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(marketIntelligenceRepository, never()).findAnonymizedAggregates("EK");

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getBenchmarks(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(marketIntelligenceRepository, never()).findAnonymizedAggregates("EK");
    }

    private void stubPermittedContext() {
        stubPermittedContextWithoutVocabulary();
        when(chargeCodeRepository.findById("BAGGAGE"))
                .thenReturn(Optional.of(new ChargeCode(
                        "BAGGAGE", "Baggage Handling", "Baggage services")));
    }

    private void stubPermittedContextWithoutVocabulary() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
    }

    private MarketIntelligenceAggregate aggregate(
            String airlineAverage, long airlineCount, String lowerQuartile, String upperQuartile) {
        return new TestAggregate(
                airlineAverage == null ? null : new BigDecimal(airlineAverage),
                airlineCount, new BigDecimal(lowerQuartile), new BigDecimal(upperQuartile));
    }

    private static final class TestAggregate implements MarketIntelligenceAggregate {
        private final BigDecimal airlineAverage;
        private final long airlineCount;
        private final BigDecimal lowerQuartile;
        private final BigDecimal upperQuartile;

        private TestAggregate(
                BigDecimal airlineAverage,
                long airlineCount,
                BigDecimal lowerQuartile,
                BigDecimal upperQuartile) {
            this.airlineAverage = airlineAverage;
            this.airlineCount = airlineCount;
            this.lowerQuartile = lowerQuartile;
            this.upperQuartile = upperQuartile;
        }

        public String getAirportCode() { return "DXB"; }
        public String getAirportName() { return "Dubai International Airport"; }
        public String getRegion() { return "MIDDLE_EAST"; }
        public String getServiceType() { return "BAGGAGE"; }
        public String getAircraftType() { return "A380"; }
        public String getOperationType() { return "INTERNATIONAL"; }
        public String getCurrency() { return "USD"; }
        public BigDecimal getAverageCost() { return new BigDecimal("120.00"); }
        public Long getObservationCount() { return 2L; }
        public BigDecimal getAirlineAverageCost() { return airlineAverage; }
        public Long getAirlineObservationCount() { return airlineCount; }
        public BigDecimal getLowerQuartile() { return lowerQuartile; }
        public BigDecimal getUpperQuartile() { return upperQuartile; }
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
