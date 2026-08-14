package com.airline.reports;

import com.airline.domain.BillingFrequency;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.OperationalFlight;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.PricingEngine;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceLineItemRepository;
import com.airline.repository.OperationalFlightRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.PendingInvoicingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
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
class PendingInvoicingServiceTest {
    @Mock private OperationalFlightRepository flightRepository;
    @Mock private InvoiceLineItemRepository invoiceLineRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private PricingEngine pricingEngine;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensions;
    private PendingInvoicingService service;

    @BeforeEach
    void setUp() {
        service = new PendingInvoicingService(flightRepository, invoiceLineRepository,
                contractRepository, pricingEngine, tenantContext, dimensions);
        lenient().when(dimensions.isAirlinePermitted(anyString())).thenReturn(true);
        lenient().when(dimensions.isAirportPermitted(anyString())).thenReturn(true);
        lenient().when(dimensions.isChargeCodePermitted(anyString())).thenReturn(true);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("mis-user", "n/a", "MIS_VIEWER"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reportsOnlyDueUninvoicedFlightServicesWithCurrencySafeGroups() {
        LocalDate asOf = LocalDate.of(2026, 8, 14);
        stubSupplier();
        OperationalFlight flight = flight("F-1", LocalDate.of(2026, 8, 13));
        when(flightRepository.findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(
                "SUPPLIER", asOf.minusDays(30), asOf)).thenReturn(List.of(flight));
        when(invoiceLineRepository.findInvoicedFlightServices("SUPPLIER", List.of("F-1")))
                .thenReturn(List.of());
        when(contractRepository.findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER", ContractStatus.APPROVED)).thenReturn(List.of(contract(
                        service("BAGGAGE", BillingFrequency.DAILY),
                        service("CLEANING", BillingFrequency.MONTHLY))));
        when(pricingEngine.calculateCharge(any(), any())).thenReturn(new BigDecimal("42.125"));

        var result = service.getPending(null, null, null, null, null, asOf);

        assertThat(result.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getOperationalFlightId()).isEqualTo("F-1");
            assertThat(item.getServiceType()).isEqualTo("BAGGAGE");
            assertThat(item.getBillingDueDate()).isEqualTo(asOf.minusDays(1));
            assertThat(item.getPendingAmount()).isEqualByComparingTo("42.13");
        });
        assertThat(result.getSummaries()).singleElement().satisfies(summary -> {
            assertThat(summary.getCurrency()).isEqualTo("USD");
            assertThat(summary.getTotalPending()).isEqualByComparingTo("42.13");
            assertThat(summary.getItemCount()).isEqualTo(1);
        });
        assertThat(result.getByAirline()).singleElement().extracting("key").isEqualTo("EK");
        assertThat(result.getByAirport()).singleElement().extracting("key").isEqualTo("DXB");
    }

    @Test
    void excludesAnAlreadyInvoicedFlightService() {
        LocalDate asOf = LocalDate.of(2026, 8, 14);
        stubSupplier();
        when(flightRepository.findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(
                "SUPPLIER", asOf.minusDays(30), asOf)).thenReturn(List.of(flight("F-1", asOf.minusDays(1))));
        when(invoiceLineRepository.findInvoicedFlightServices("SUPPLIER", List.of("F-1")))
                .thenReturn(List.of(InvoiceLineItem.builder().operationalFlightId("F-1")
                        .chargeCode("BAGGAGE").build()));
        when(contractRepository.findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(
                "SUPPLIER", ContractStatus.APPROVED)).thenReturn(List.of(contract(
                        service("BAGGAGE", BillingFrequency.DAILY))));

        assertThat(service.getPending(null, null, null, null, null, asOf).getItems()).isEmpty();
        verify(pricingEngine, never()).calculateCharge(any(), any());
    }

    @Test
    void deniesAirlineTenantBeforeReadingFlights() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        assertThatThrownBy(() -> service.getPending(null, null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class);
        verify(flightRepository, never()).findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(
                anyString(), any(), any());
    }

    @Test
    void deniesMissingMisViewerBeforeReadingFlights() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("entry-user", "n/a", "INVOICE_ENTRY"));
        assertThatThrownBy(() -> service.getPending(null, null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(flightRepository, never()).findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(
                anyString(), any(), any());
    }

    private void stubSupplier() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SUPPLIER");
    }

    private OperationalFlight flight(String id, LocalDate date) {
        return OperationalFlight.builder().id(id).supplierId("SUPPLIER").airlineId("EK")
                .airportCode("DXB").flightNumber("EK1").flightDate(date).tailId("A6-AAA")
                .departureAirport("DXB").destinationAirport("LHR")
                .quantityDrivers(Map.of("events", 1)).build();
    }

    private Contract contract(ServiceConfiguration... services) {
        return Contract.builder().id("C-1").groundHandlerId("SUPPLIER").airlineId("EK")
                .airportCode("DXB").startDate(LocalDate.of(2026, 8, 1))
                .endDate(LocalDate.of(2026, 12, 31)).status(ContractStatus.APPROVED)
                .currency("USD").services(List.of(services)).build();
    }

    private ServiceConfiguration service(String code, BillingFrequency frequency) {
        return ServiceConfiguration.builder().id(code).chargeCode(code).serviceName(code)
                .billingFrequency(frequency).rateDetails(Map.of()).build();
    }
}
