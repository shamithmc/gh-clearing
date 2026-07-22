package com.airline.service;

import com.airline.api.dto.DashboardDtos.*;
import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @InjectMocks
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        // Default permit everything for dimensional access
        lenient().when(dimensionalSecurityEvaluator.isAirportPermitted(anyString())).thenReturn(true);
        lenient().when(dimensionalSecurityEvaluator.isAirlinePermitted(anyString())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void airlineDashboard_requiresMisViewerBeforeLoadingTenantData() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticateAs("INVOICE_REVIEWER");

        assertThatThrownBy(() -> dashboardService.getReceivablesSummary(null, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");

        verify(invoiceRepository, never()).findAllByTenantId("EK");
    }

    @Test
    void airlineExpiringContracts_requiresMisViewerBeforeLoadingTenantData() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticateAs("CONTRACT_VIEWER");

        assertThatThrownBy(() -> dashboardService.getExpiringContracts(null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MIS_VIEWER");

        verify(contractRepository, never()).findByAirlineId("EK");
    }

    @Test
    void airlineDashboard_withMisViewerFiltersRestrictedDimensions() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        authenticateAs("MIS_VIEWER");

        Invoice permitted = Invoice.builder()
                .id("allowed")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("750.00"))
                .issueDate(LocalDate.now())
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode("BAGGAGE").build()))
                .build();
        Invoice restricted = Invoice.builder()
                .id("restricted")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("LHR")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("900.00"))
                .issueDate(LocalDate.now())
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode("CATERING").build()))
                .build();
        when(invoiceRepository.findAllByTenantId("EK")).thenReturn(List.of(permitted, restricted));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("LHR")).thenReturn(false);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);

        ReceivablesSummary summary = dashboardService.getReceivablesSummary(null, null, null, null);

        assertThat(summary.getTotalOutstanding()).isEqualByComparingTo("750.00");
        assertThat(summary.getByAirport()).extracting(GroupedReceivable::getKey)
                .containsExactly("DXB");
    }

    @Test
    void getReceivablesSummary_calculatesCorrectly() {
        Invoice invoice1 = Invoice.builder()
                .id("inv-1")
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1000.00"))
                .creditNoteAmount(new BigDecimal("100.00"))
                .issueDate(LocalDate.now().minusDays(10)) // 0-30 aging
                .build();

        Invoice invoice2 = Invoice.builder()
                .id("inv-2")
                .invoiceNumber("INV-200")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.DISPUTED)
                .totalAmount(new BigDecimal("500.00"))
                .creditNoteAmount(BigDecimal.ZERO)
                .issueDate(LocalDate.now().minusDays(45)) // 31-60 aging
                .build();

        // Draft invoice should be excluded
        Invoice invoiceDraft = Invoice.builder()
                .id("inv-draft")
                .supplierId("SWISSPORT")
                .status(InvoiceStatus.DRAFT)
                .build();

        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(Arrays.asList(invoice1, invoice2, invoiceDraft));

        ReceivablesSummary summary = dashboardService.getReceivablesSummary(null, null, null, null);

        // 1000 - 100 + 500 = 1400
        assertThat(summary.getTotalOutstanding()).isEqualByComparingTo("1400.00");
        assertThat(summary.getAging().getZeroToThirty()).isEqualByComparingTo("900.00");
        assertThat(summary.getAging().getThirtyOneToSixty()).isEqualByComparingTo("500.00");
        assertThat(summary.getAging().getSixtyOneToNinety()).isEqualByComparingTo("0.00");
        
        assertThat(summary.getByAirline()).hasSize(1);
        assertThat(summary.getByAirline().get(0).getKey()).isEqualTo("EK");
        assertThat(summary.getByAirline().get(0).getAmount()).isEqualByComparingTo("1400.00");
    }

    @Test
    void getReceivablesSummary_filtersByAirportAndAirlineCorrectly() {
        Invoice invoice1 = Invoice.builder()
                .id("inv-1")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1000.00"))
                .issueDate(LocalDate.now().minusDays(10))
                .build();

        Invoice invoice2 = Invoice.builder()
                .id("inv-2")
                .supplierId("SWISSPORT")
                .airlineId("LH")
                .airportCode("LHR")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("500.00"))
                .issueDate(LocalDate.now().minusDays(10))
                .build();

        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(Arrays.asList(invoice1, invoice2));

        // Filter by Airport DXB
        ReceivablesSummary summaryDxb = dashboardService.getReceivablesSummary(null, "DXB", null, null);
        assertThat(summaryDxb.getTotalOutstanding()).isEqualByComparingTo("1000.00");

        // Filter by Airline LH
        ReceivablesSummary summaryLh = dashboardService.getReceivablesSummary("LH", null, null, null);
        assertThat(summaryLh.getTotalOutstanding()).isEqualByComparingTo("500.00");
    }

    @Test
    void getInvoicedTrend_groupsCorrectly() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1200.00"))
                .issueDate(LocalDate.of(2026, 7, 10))
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .build();

        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(Collections.singletonList(invoice));

        List<InvoicedTrend> trend = dashboardService.getInvoicedTrend(null, null, null, null);

        assertThat(trend).hasSize(1);
        assertThat(trend.get(0).getMonth()).isEqualTo("2026-07");
        assertThat(trend.get(0).getTotalAmount()).isEqualByComparingTo("1200.00");
    }

    @Test
    void getExpiringContracts_findsCorrectly() {
        Contract activeExpiring = Contract.builder()
                .id("c-1")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .endDate(LocalDate.now().plusDays(15)) // Expiring in 15 days (within 90)
                .build();

        Contract activeFar = Contract.builder()
                .id("c-2")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .endDate(LocalDate.now().plusDays(120)) // Expiring in 120 days (outside 90)
                .build();

        when(contractRepository.findByGroundHandlerId("SWISSPORT")).thenReturn(Arrays.asList(activeExpiring, activeFar));

        List<ExpiringContract> expiring = dashboardService.getExpiringContracts(null, null);

        assertThat(expiring).hasSize(1);
        assertThat(expiring.get(0).getId()).isEqualTo("c-1");
        assertThat(expiring.get(0).getDaysRemaining()).isEqualTo(15);
    }

    @Test
    void receivables_excludesInvoiceContainingRestrictedChargeCode() {
        InvoiceLineItem restrictedLine = InvoiceLineItem.builder()
                .chargeCode("CATERING")
                .calculatedAmount(new BigDecimal("1000.00"))
                .build();
        Invoice invoice = Invoice.builder()
                .id("inv-restricted")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1000.00"))
                .issueDate(LocalDate.now())
                .lineItems(List.of(restrictedLine))
                .build();
        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(List.of(invoice));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CATERING")).thenReturn(false);

        ReceivablesSummary summary = dashboardService.getReceivablesSummary(null, null, null, null);

        assertThat(summary.getTotalOutstanding()).isEqualByComparingTo("0.00");
    }

    @Test
    void expiringContracts_excludesContractContainingRestrictedChargeCode() {
        ServiceConfiguration service = ServiceConfiguration.builder().chargeCode("CATERING").build();
        Contract contract = Contract.builder()
                .id("c-restricted")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .status(ContractStatus.APPROVED)
                .endDate(LocalDate.now().plusDays(15))
                .services(List.of(service))
                .build();
        when(contractRepository.findByGroundHandlerId("SWISSPORT")).thenReturn(List.of(contract));
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CATERING")).thenReturn(false);

        assertThat(dashboardService.getExpiringContracts(null, null)).isEmpty();
    }

    private void authenticateAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("airline-user", null, role));
    }
}
