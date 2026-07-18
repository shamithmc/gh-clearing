package com.airline.service;

import com.airline.api.dto.DashboardDtos.*;
import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.TenantContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private TenantContext tenantContext;

    @InjectMocks
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
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

        ReceivablesSummary summary = dashboardService.getReceivablesSummary();

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
    void getInvoicedTrend_groupsCorrectly() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.SENT)
                .totalAmount(new BigDecimal("1200.00"))
                .issueDate(LocalDate.of(2026, 7, 10))
                .supplierId("SWISSPORT")
                .build();

        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(Collections.singletonList(invoice));

        List<InvoicedTrend> trend = dashboardService.getInvoicedTrend();

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

        List<ExpiringContract> expiring = dashboardService.getExpiringContracts();

        assertThat(expiring).hasSize(1);
        assertThat(expiring.get(0).getId()).isEqualTo("c-1");
        assertThat(expiring.get(0).getDaysRemaining()).isEqualTo(15);
    }
}
