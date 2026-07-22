package com.airline.invoices;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.DocumentGenerationJob;
import com.airline.service.InvoiceService;
import com.airline.xml.IsXmlGeneratorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirlineInvoiceViewerTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private com.airline.pricing.PricingEngine pricingEngine;
    @Mock private TenantContext tenantContext;
    @Mock private InvoiceAuditLogRepository invoiceAuditLogRepository;
    @Mock private DocumentGenerationJob documentGenerationJob;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock private IsXmlGeneratorService isXmlGeneratorService;
    @Mock private org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(invoiceRepository, contractRepository, pricingEngine,
                tenantContext, new ObjectMapper(), invoiceAuditLogRepository, documentGenerationJob,
                dimensionalSecurityEvaluator, isXmlGeneratorService, applicationEventPublisher);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("invoice-reviewer", "n/a", "INVOICE_REVIEWER"));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void airlineSeesOnlyDispatchedInvoices() {
        Invoice draft = invoice("draft", InvoiceStatus.DRAFT, "DXB", "BAGGAGE");
        Invoice finalized = invoice("final", InvoiceStatus.FINALIZED, "DXB", "BAGGAGE");
        Invoice sent = invoice("sent", InvoiceStatus.SENT, "DXB", "BAGGAGE");
        Invoice paid = invoice("paid", InvoiceStatus.PAID, "DXB", "BAGGAGE");
        Invoice disputed = invoice("disputed", InvoiceStatus.DISPUTED, "DXB", "BAGGAGE");
        when(invoiceRepository.findAllByTenantId("EK"))
                .thenReturn(List.of(draft, finalized, sent, paid, disputed));
        permit("DXB", "EK", "BAGGAGE");

        assertThat(invoiceService.listInvoices())
                .extracting(Invoice::getId)
                .containsExactly("sent", "paid", "disputed");
    }

    @Test
    void airlineFiltersByAirportServiceAndStatus() {
        Invoice matching = invoice("matching", InvoiceStatus.SENT, "DXB", "BAGGAGE");
        Invoice wrongAirport = invoice("wrong-airport", InvoiceStatus.SENT, "FRA", "BAGGAGE");
        Invoice wrongService = invoice("wrong-service", InvoiceStatus.SENT, "DXB", "CLEANING");
        Invoice wrongStatus = invoice("wrong-status", InvoiceStatus.PAID, "DXB", "BAGGAGE");
        when(invoiceRepository.findAllByTenantId("EK"))
                .thenReturn(List.of(matching, wrongAirport, wrongService, wrongStatus));
        when(dimensionalSecurityEvaluator.isAirportPermitted(any())).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted(any())).thenReturn(true);

        assertThat(invoiceService.listInvoices(InvoiceStatus.SENT, " dxb ", " baggage "))
                .extracting(Invoice::getId)
                .containsExactly("matching");
    }

    @Test
    void airlineDraftStatusFilterFailsClosedWithoutQuerying() {
        assertThat(invoiceService.listInvoices(InvoiceStatus.DRAFT, null, null)).isEmpty();
        verify(invoiceRepository, never()).findAllByTenantId(any());
    }

    @Test
    void userWithoutInvoiceReviewerRoleCannotList() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("mis-viewer", "n/a", "MIS_VIEWER"));

        assertThatThrownBy(invoiceService::listInvoices)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("INVOICE_REVIEWER");
        verify(invoiceRepository, never()).findAllByTenantId(any());
    }

    @Test
    void preDispatchInvoiceCannotBeReadByAirline() {
        Invoice finalized = invoice("final", InvoiceStatus.FINALIZED, "DXB", "BAGGAGE");
        when(invoiceRepository.findByIdAndTenantId("final", "EK")).thenReturn(Optional.of(finalized));

        assertThatThrownBy(() -> invoiceService.getInvoice("final"))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Invoice not found");
    }

    @Test
    void dispatchedInvoiceReadIsTenantAndDimensionScoped() {
        Invoice sent = invoice("sent", InvoiceStatus.SENT, "DXB", "BAGGAGE");
        when(invoiceRepository.findByIdAndTenantId("sent", "EK")).thenReturn(Optional.of(sent));

        assertThat(invoiceService.getInvoice("sent")).isSameAs(sent);
        verify(invoiceRepository).findByIdAndTenantId("sent", "EK");
        verify(invoiceRepository, never()).findById("sent");
        verify(dimensionalSecurityEvaluator)
                .verifyAccess("DXB", "EK", java.util.Set.of("BAGGAGE"));
    }

    @Test
    void dimensionalRestrictionFiltersDispatchedInvoice() {
        Invoice baggage = invoice("baggage", InvoiceStatus.SENT, "DXB", "BAGGAGE");
        Invoice cleaning = invoice("cleaning", InvoiceStatus.SENT, "DXB", "CLEANING");
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(baggage, cleaning));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CLEANING")).thenReturn(false);

        assertThat(invoiceService.listInvoices())
                .extracting(Invoice::getId)
                .containsExactly("baggage");
    }

    private Invoice invoice(String id, InvoiceStatus status, String airport, String chargeCode) {
        return Invoice.builder()
                .id(id)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode(airport)
                .status(status)
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode(chargeCode).build()))
                .build();
    }

    private void permit(String airport, String airline, String chargeCode) {
        when(dimensionalSecurityEvaluator.isAirportPermitted(airport)).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted(airline)).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted(chargeCode)).thenReturn(true);
    }
}
