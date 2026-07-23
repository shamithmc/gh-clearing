package com.airline.pricing;

import com.airline.domain.Airport;
import com.airline.domain.ChargeCode;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.AirportRepository;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.repository.MtowRecordRepository;
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
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingBenchmarkServiceTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private AirportRepository airportRepository;
    @Mock private ChargeCodeRepository chargeCodeRepository;
    @Mock private MtowRecordRepository mtowRecordRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private PricingBenchmarkService service;

    @BeforeEach
    void setUp() {
        service = new PricingBenchmarkService(invoiceRepository, airportRepository,
                chargeCodeRepository, mtowRecordRepository, tenantContext,
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
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("market-low", "SUPPLIER-A", "LH", "100.00"),
                invoice("airline-high", "SUPPLIER-B", "EK", "140.00")));

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
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("airline-low", "SUPPLIER-A", "EK", "100.00"),
                invoice("market-high", "SUPPLIER-B", "LH", "140.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("BOTTOM_25_PERCENT_DISCOUNT");
    }

    @Test
    void classifiesOwnRateBetweenQuartilesAsMidMarket() {
        stubPermittedContext();
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("market-low", "SUPPLIER-A", "LH", "100.00"),
                invoice("airline-mid", "SUPPLIER-B", "EK", "120.00"),
                invoice("market-high", "SUPPLIER-C", "LH", "140.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("MID_50_PERCENT");
    }

    @Test
    void equalMarketRatesAreMidMarketRatherThanArtificiallyPremium() {
        stubPermittedContext();
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("market", "SUPPLIER-A", "LH", "120.00"),
                invoice("airline", "SUPPLIER-B", "EK", "120.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null))
                .singleElement()
                .extracting(benchmark -> benchmark.getMarketPosition())
                .isEqualTo("MID_50_PERCENT");
    }

    @Test
    void suppressesBenchmarksWithoutTwoSuppliersOrOwnAirlineObservations() {
        stubPermittedContextWithoutVocabulary();
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("airline-1", "SUPPLIER-A", "EK", "100.00"),
                invoice("airline-2", "SUPPLIER-A", "EK", "140.00")));

        assertThat(service.getBenchmarks(null, null, null, null, null)).isEmpty();
        verify(chargeCodeRepository, never()).findById("BAGGAGE");

        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("market-1", "SUPPLIER-A", "LH", "100.00"),
                invoice("market-2", "SUPPLIER-B", "LH", "140.00")));
        assertThat(service.getBenchmarks(null, null, null, null, null)).isEmpty();
    }

    @Test
    void appliesRequestedDimensionsAndAbacBeforeClassifying() {
        stubPermittedContext();
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("market", "SUPPLIER-A", "LH", "100.00"),
                invoice("airline", "SUPPLIER-B", "EK", "140.00")));

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
        verify(invoiceRepository, never()).findByStatusIn(anySet());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getBenchmarks(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(invoiceRepository, never()).findByStatusIn(anySet());
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
        when(airportRepository.findById("DXB")).thenReturn(Optional.of(
                new Airport("DXB", "Dubai International Airport", "Dubai",
                        "United Arab Emirates", "MIDDLE_EAST")));
        when(airportRepository.findById("FRA")).thenReturn(Optional.of(
                new Airport("FRA", "Frankfurt Airport", "Frankfurt",
                        "Germany", "EUROPE")));
    }

    private Invoice invoice(
            String id, String supplierId, String airlineId, String amount) {
        InvoiceLineItem item = InvoiceLineItem.builder()
                .id(id + "-line")
                .aircraftReg("A6-TEST")
                .aircraftType("A380")
                .origin("DXB")
                .destination("FRA")
                .chargeCode("BAGGAGE")
                .serviceName("Baggage Handling")
                .calculatedAmount(new BigDecimal(amount))
                .build();
        Invoice invoice = Invoice.builder()
                .id(id)
                .supplierId(supplierId)
                .airlineId(airlineId)
                .airportCode("DXB")
                .currency("USD")
                .status(InvoiceStatus.SENT)
                .lineItems(List.of(item))
                .build();
        item.setInvoice(invoice);
        return invoice;
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
