package com.airline.marketintelligence;

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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirportCostIndexServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private AirportRepository airportRepository;
    @Mock
    private ChargeCodeRepository chargeCodeRepository;
    @Mock
    private MtowRecordRepository mtowRecordRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirportCostIndexService service;

    @BeforeEach
    void setUp() {
        service = new AirportCostIndexService(invoiceRepository, airportRepository,
                chargeCodeRepository, mtowRecordRepository, tenantContext,
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
        stubAirports();
        when(chargeCodeRepository.findById("BAGGAGE"))
                .thenReturn(Optional.of(new ChargeCode(
                        "BAGGAGE", "Baggage Handling", "Baggage services")));
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("invoice-1", "SUPPLIER-A", "100.00"),
                invoice("invoice-2", "SUPPLIER-B", "140.00")));

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
    void suppressesSegmentWhenOnlyOneDistinctSupplierContributes() {
        allowAirlineAndDimensions();
        stubAirports();
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("invoice-1", "SUPPLIER-A", "100.00"),
                invoice("invoice-2", "SUPPLIER-A", "140.00")));

        assertThat(service.getIndex(null, null, null, null, null)).isEmpty();
        verify(chargeCodeRepository, never()).findById("BAGGAGE");
    }

    @Test
    void appliesAirportAndChargeCodeAbacBeforeAggregation() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(false);
        when(airportRepository.findById("DXB")).thenReturn(Optional.of(dxb()));
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("invoice-1", "SUPPLIER-A", "100.00"),
                invoice("invoice-2", "SUPPLIER-B", "140.00")));

        assertThat(service.getIndex(null, null, null, null, null)).isEmpty();
        verify(dimensionalSecurityEvaluator, never()).isChargeCodePermitted("BAGGAGE");
    }

    @Test
    void honorsAllRequestedDimensions() {
        allowAirlineAndDimensions();
        stubAirports();
        when(chargeCodeRepository.findById("BAGGAGE"))
                .thenReturn(Optional.of(new ChargeCode(
                        "BAGGAGE", "Baggage Handling", "Baggage services")));
        when(invoiceRepository.findByStatusIn(anySet())).thenReturn(List.of(
                invoice("invoice-1", "SUPPLIER-A", "100.00"),
                invoice("invoice-2", "SUPPLIER-B", "140.00")));

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
        verify(invoiceRepository, never()).findByStatusIn(anySet());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        airlineAuthentication("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getIndex(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(invoiceRepository, never()).findByStatusIn(anySet());
    }

    private void allowAirlineAndDimensions() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
    }

    private void stubAirports() {
        when(airportRepository.findById("DXB")).thenReturn(Optional.of(dxb()));
        when(airportRepository.findById("FRA")).thenReturn(Optional.of(
                new Airport("FRA", "Frankfurt Airport", "Frankfurt", "Germany", "EUROPE")));
    }

    private Airport dxb() {
        return new Airport("DXB", "Dubai International Airport", "Dubai",
                "United Arab Emirates", "MIDDLE_EAST");
    }

    private Invoice invoice(String id, String supplierId, String amount) {
        InvoiceLineItem lineItem = InvoiceLineItem.builder()
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
                .airlineId("EK")
                .airportCode("DXB")
                .currency("USD")
                .status(InvoiceStatus.SENT)
                .lineItems(List.of(lineItem))
                .build();
        lineItem.setInvoice(invoice);
        return invoice;
    }

    private void airlineAuthentication(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
