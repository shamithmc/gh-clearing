package com.airline.invoices;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.AirlineFinancialService;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirlineBilledAmountsServiceTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private AirlineFinancialService service;

    @BeforeEach
    void setUp() {
        service = new AirlineFinancialService(
                invoiceRepository, tenantContext, dimensionalSecurityEvaluator);
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
    void aggregatesDispatchedTenantInvoicesBySupplierAirportServiceAndCurrency() {
        stubAirlineTenant();
        Invoice sent = invoice("sent", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.SENT, "100.00", "10.00", LocalDate.of(2026, 7, 1),
                line("BAGGAGE", "60.00"), line("CLEANING", "40.00"));
        Invoice paid = invoice("paid", "SUPPLIER-B", "EK", "DXB", "USD",
                InvoiceStatus.PAID, "150.00", "0.00", LocalDate.of(2026, 7, 2),
                line("BAGGAGE", "150.00"));
        Invoice draft = invoice("draft", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.DRAFT, "500.00", "0.00", LocalDate.of(2026, 7, 3),
                line("BAGGAGE", "500.00"));
        Invoice anotherAirline = invoice("other", "SUPPLIER-A", "LH", "DXB", "USD",
                InvoiceStatus.SENT, "900.00", "0.00", LocalDate.of(2026, 7, 4),
                line("BAGGAGE", "900.00"));
        when(invoiceRepository.findAllByTenantId("EK"))
                .thenReturn(List.of(sent, paid, draft, anotherAirline));

        var result = service.getBilledAmounts(null, null, null, null, null);

        assertThat(result.getSummaries()).singleElement().satisfies(summary -> {
            assertThat(summary.getCurrency()).isEqualTo("USD");
            assertThat(summary.getTotalBilled()).isEqualByComparingTo("250.00");
            assertThat(summary.getTotalPaid()).isEqualByComparingTo("150.00");
            assertThat(summary.getTotalOutstanding()).isEqualByComparingTo("90.00");
            assertThat(summary.getInvoiceCount()).isEqualTo(2);
        });
        assertThat(result.getBySupplier())
                .extracting(group -> group.getKey())
                .containsExactlyInAnyOrder("SUPPLIER-A", "SUPPLIER-B");
        assertThat(result.getByAirport()).singleElement()
                .satisfies(group -> assertThat(group.getTotalBilled())
                        .isEqualByComparingTo("250.00"));
        assertThat(result.getByService()).filteredOn(group -> "BAGGAGE".equals(group.getKey()))
                .singleElement().satisfies(group -> {
                    assertThat(group.getTotalBilled()).isEqualByComparingTo("210.00");
                    assertThat(group.getTotalOutstanding()).isEqualByComparingTo("54.00");
                });
        assertThat(result.getByService()).filteredOn(group -> "CLEANING".equals(group.getKey()))
                .singleElement().satisfies(group -> {
                    assertThat(group.getTotalBilled()).isEqualByComparingTo("40.00");
                    assertThat(group.getTotalOutstanding()).isEqualByComparingTo("36.00");
                });
        assertThat(result.getInvoices()).hasSize(2)
                .extracting(invoice -> invoice.getId())
                .containsExactly("paid", "sent");
        verify(invoiceRepository).findAllByTenantId("EK");
    }

    @Test
    void serviceFilterUsesOnlyMatchingLineAmountsInEveryBreakdown() {
        stubAirlineTenant();
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(
                invoice("mixed", "SUPPLIER-A", "EK", "DXB", "USD",
                        InvoiceStatus.SENT, "100.00", "10.00", LocalDate.of(2026, 7, 1),
                        line("BAGGAGE", "60.00"), line("CLEANING", "40.00"))));

        var result = service.getBilledAmounts(null, null, "baggage", null, null);

        assertThat(result.getSummaries()).singleElement().satisfies(summary -> {
            assertThat(summary.getTotalBilled()).isEqualByComparingTo("60.00");
            assertThat(summary.getTotalOutstanding()).isEqualByComparingTo("54.00");
        });
        assertThat(result.getByService()).singleElement()
                .satisfies(group -> assertThat(group.getKey()).isEqualTo("BAGGAGE"));
        assertThat(result.getInvoices()).singleElement().satisfies(invoice -> {
            assertThat(invoice.getInvoiceTotal()).isEqualByComparingTo("100.00");
            assertThat(invoice.getFilteredAmount()).isEqualByComparingTo("60.00");
            assertThat(invoice.getServiceTypes()).containsExactly("BAGGAGE");
        });
    }

    @Test
    void keepsCurrenciesSeparateAndAppliesSupplierAirportAndDateFilters() {
        stubAirlineTenant();
        Invoice usd = invoice("usd", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.SENT, "100.00", "0.00", LocalDate.of(2026, 6, 30),
                line("BAGGAGE", "100.00"));
        Invoice eur = invoice("eur", "SUPPLIER-B", "EK", "LHR", "EUR",
                InvoiceStatus.SENT, "80.00", "0.00", LocalDate.of(2026, 7, 15),
                line("BAGGAGE", "80.00"));
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(usd, eur));

        assertThat(service.getBilledAmounts(null, null, null, null, null).getSummaries())
                .extracting(summary -> summary.getCurrency())
                .containsExactly("EUR", "USD");
        assertThat(service.getBilledAmounts(
                "supplier-b", "lhr", null,
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)).getInvoices())
                .singleElement()
                .extracting(invoice -> invoice.getId())
                .isEqualTo("eur");
    }

    @Test
    void dimensionalDenialFailsClosedForMixedServiceInvoice() {
        stubAirlineTenant();
        Invoice mixed = invoice("mixed", "SUPPLIER-A", "EK", "DXB", "USD",
                InvoiceStatus.SENT, "100.00", "0.00", LocalDate.of(2026, 7, 1),
                line("BAGGAGE", "60.00"), line("CLEANING", "40.00"));
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(mixed));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);

        assertThat(service.getBilledAmounts(null, null, null, null, null).getInvoices())
                .isEmpty();
    }

    @Test
    void rejectsInvalidDateRangeBeforeReadingInvoices() {
        stubAirlineTenant();

        assertThatThrownBy(() -> service.getBilledAmounts(
                null, null, null, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 7, 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Start date");
        verify(invoiceRepository, never()).findAllByTenantId("EK");
    }

    @Test
    void deniesNonAirlinesAndMissingMisViewerBeforeTenantRead() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        assertThatThrownBy(() -> service.getBilledAmounts(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only to airlines");
        verify(invoiceRepository, never()).findAllByTenantId(anyString());

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticate("INVOICE_REVIEWER");
        assertThatThrownBy(() -> service.getBilledAmounts(null, null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");
        verify(invoiceRepository, never()).findAllByTenantId(anyString());
    }

    private void stubAirlineTenant() {
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
    }

    private Invoice invoice(
            String id,
            String supplierId,
            String airlineId,
            String airport,
            String currency,
            InvoiceStatus status,
            String total,
            String credit,
            LocalDate issueDate,
            InvoiceLineItem... lines) {
        Invoice invoice = Invoice.builder()
                .id(id)
                .invoiceNumber("INV-" + id.toUpperCase())
                .supplierId(supplierId)
                .airlineId(airlineId)
                .airportCode(airport)
                .currency(currency)
                .issueDate(issueDate)
                .dueDate(issueDate.plusDays(30))
                .status(status)
                .totalAmount(new BigDecimal(total))
                .creditNoteAmount(new BigDecimal(credit))
                .lineItems(List.of(lines))
                .build();
        for (InvoiceLineItem line : lines) {
            line.setInvoice(invoice);
        }
        return invoice;
    }

    private InvoiceLineItem line(String chargeCode, String amount) {
        return InvoiceLineItem.builder()
                .id(chargeCode + "-" + amount)
                .chargeCode(chargeCode)
                .serviceName(chargeCode)
                .calculatedAmount(new BigDecimal(amount))
                .build();
    }

    private void authenticate(String... roles) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", roles));
        SecurityContextHolder.setContext(context);
    }
}
