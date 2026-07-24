package com.airline.reports;

import com.airline.domain.Airport;
import com.airline.domain.BillingFrequency;
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
import com.airline.service.AirlineCurrentFootprintService;
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
class AirlineCurrentFootprintServiceTest {

    @Mock private ContractRepository contractRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private AirportRepository airportRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirlineCurrentFootprintService service;

    @BeforeEach
    void setUp() {
        service = new AirlineCurrentFootprintService(
                contractRepository, invoiceRepository, airportRepository,
                tenantContext, dimensionalSecurityEvaluator);
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
    void mapsActiveContractsWithMonthlyValuesAndDispatchedInvoiceSummaries() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract dxb = contract("dxb", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(2), today.plusMonths(2), "USD",
                service("bags", "BAGGAGE", BillingFrequency.DAILY, "10"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "100"));
        Contract future = contract("future", "SUPPLIER-A", "EK", "FRA",
                today.plusDays(1), today.plusMonths(2), "USD",
                service("ramp", "RAMP_HANDLING", BillingFrequency.MONTHLY, "500"));
        Contract otherAirline = contract("other", "SUPPLIER-A", "LH", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags-other", "BAGGAGE", BillingFrequency.MONTHLY, "900"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(dxb, future, otherAirline));
        Invoice sent = invoice("sent", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.SENT, today.minusDays(10), "250",
                line("BAGGAGE", "150"), line("CLEANING", "100"));
        Invoice draft = invoice("draft", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.DRAFT, today.minusDays(5), "700",
                line("BAGGAGE", "700"));
        Invoice old = invoice("old", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.SENT, today.minusMonths(13), "800",
                line("BAGGAGE", "800"));
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(sent, draft, old));
        when(airportRepository.findAllById(any())).thenReturn(List.of(airport("DXB")));

        var result = service.getCurrentFootprint(null, null, null, null, 12);

        assertThat(result.getSummary().getAirportCount()).isEqualTo(1);
        assertThat(result.getSummary().getSupplierCount()).isEqualTo(1);
        assertThat(result.getSummary().getServiceCount()).isEqualTo(2);
        assertThat(result.getSummary().getActiveContractCount()).isEqualTo(1);
        assertThat(result.getSummary().getDispatchedInvoiceCount()).isEqualTo(1);
        assertThat(result.getAirports()).singleElement().satisfies(point -> {
            assertThat(point.getAirportCode()).isEqualTo("DXB");
            assertThat(point.getSuppliers()).containsExactly("SUPPLIER-A");
            assertThat(point.getServiceTypes()).containsExactly("BAGGAGE", "CLEANING");
            assertThat(point.getFinancials()).singleElement().satisfies(financial -> {
                assertThat(financial.getCurrency()).isEqualTo("USD");
                assertThat(financial.getMonthlyContractValue()).isEqualByComparingTo("400.00");
                assertThat(financial.getInvoicedValue()).isEqualByComparingTo("250.00");
                assertThat(financial.getInvoiceCount()).isEqualTo(1);
            });
        });
        assertThat(result.getContracts()).singleElement()
                .satisfies(contract -> assertThat(contract.getServices())
                        .extracting(rate -> rate.getMonthlyExpectedValue())
                        .containsExactly(new BigDecimal("300.00"), new BigDecimal("100.00")));
        assertThat(result.getInvoices()).singleElement()
                .satisfies(invoice -> assertThat(invoice.getInvoiceId()).isEqualTo("sent"));
    }

    @Test
    void filtersSupplierAirportServiceAndCurrencyAtLineLevel() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract contract = contract("dxb", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags", "BAGGAGE", BillingFrequency.MONTHLY, "75"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "25"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(contract));
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(
                invoice("sent", "SUPPLIER-A", "EK", "DXB", "USD",
                        InvoiceStatus.SENT, today.minusDays(2), "100",
                        line("BAGGAGE", "75"), line("CLEANING", "25"))));
        when(airportRepository.findAllById(any())).thenReturn(List.of(airport("DXB")));

        var result = service.getCurrentFootprint(
                "supplier-a", "dxb", "baggage", "usd", 6);

        assertThat(result.getContracts()).singleElement().satisfies(detail ->
                assertThat(detail.getServices()).singleElement().satisfies(rate -> {
                    assertThat(rate.getServiceType()).isEqualTo("BAGGAGE");
                    assertThat(rate.getMonthlyExpectedValue()).isEqualByComparingTo("75.00");
                }));
        assertThat(result.getInvoices()).singleElement().satisfies(invoice -> {
            assertThat(invoice.getInvoicedValue()).isEqualByComparingTo("75.00");
            assertThat(invoice.getServiceTypes()).containsExactly("BAGGAGE");
        });
        assertThat(result.getAirports()).singleElement()
                .satisfies(point -> assertThat(point.getFinancials()).singleElement()
                        .satisfies(financial -> {
                            assertThat(financial.getMonthlyContractValue())
                                    .isEqualByComparingTo("75.00");
                            assertThat(financial.getInvoicedValue())
                                    .isEqualByComparingTo("75.00");
                        }));
    }

    @Test
    void dimensionalDenialRemovesContractAndPreventsInvoicePairExposure() {
        stubAirlineTenant();
        LocalDate today = LocalDate.now();
        Contract mixed = contract("mixed", "SUPPLIER-A", "EK", "DXB",
                today.minusMonths(1), today.plusMonths(1), "USD",
                service("bags", "BAGGAGE", BillingFrequency.MONTHLY, "75"),
                service("clean", "CLEANING", BillingFrequency.MONTHLY, "25"));
        when(contractRepository.findByAirlineIdAndStatusOrderByCreatedAtDesc(
                "EK", ContractStatus.APPROVED)).thenReturn(List.of(mixed));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of());
        when(airportRepository.findAllById(any())).thenReturn(List.of());

        var result = service.getCurrentFootprint(null, null, "BAGGAGE", null, 12);

        assertThat(result.getAirports()).isEmpty();
        assertThat(result.getContracts()).isEmpty();
        assertThat(result.getInvoices()).isEmpty();
    }

    @Test
    void validatesHistoryAndDeniesUnauthorizedTenantsBeforeReads() {
        stubAirlineTenant();
        assertThatThrownBy(() -> service.getCurrentFootprint(
                null, null, null, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("between 1 and 24");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusOrderByCreatedAtDesc(anyString(), any());

        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        assertThatThrownBy(() -> service.getCurrentFootprint(
                null, null, null, null, 12))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(invoiceRepository, never()).findAllByTenantId(anyString());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("CONTRACT_VIEWER");
        assertThatThrownBy(() -> service.getCurrentFootprint(
                null, null, null, null, 12))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(invoiceRepository, never()).findAllByTenantId(anyString());
    }

    private void stubAirlineTenant() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
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

    private Invoice invoice(
            String id, String supplier, String airline, String airport, String currency,
            InvoiceStatus status, LocalDate issueDate, String total,
            InvoiceLineItem... lines) {
        Invoice invoice = Invoice.builder().id(id).invoiceNumber("INV-" + id)
                .supplierId(supplier).airlineId(airline).airportCode(airport)
                .currency(currency).status(status).issueDate(issueDate)
                .dueDate(issueDate.plusDays(30)).totalAmount(new BigDecimal(total))
                .lineItems(List.of(lines)).build();
        for (InvoiceLineItem line : lines) {
            line.setInvoice(invoice);
        }
        return invoice;
    }

    private InvoiceLineItem line(String code, String amount) {
        return InvoiceLineItem.builder().id(code + amount).chargeCode(code)
                .serviceName(code).calculatedAmount(new BigDecimal(amount)).build();
    }

    private Airport airport(String code) {
        return new Airport(code, code + " Airport", "City", "Country", "REGION",
                new BigDecimal("25.249790"), new BigDecimal("55.370992"));
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
