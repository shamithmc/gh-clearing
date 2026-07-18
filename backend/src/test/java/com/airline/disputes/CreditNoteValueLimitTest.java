package com.airline.disputes;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceRepository;
import com.airline.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.airline.security.TenantContext;
import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * INV-11: Credit Note Value Limit.
 * Verifies that the total value of all Credit Notes generated for a disputed Invoice MUST NOT exceed the total value of the original Invoice.
 */
@ExtendWith(MockitoExtension.class)
class CreditNoteValueLimitTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    @Test
    void generateCreditNote_exceedingInvoiceTotal_fails() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.DISPUTED)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .totalAmount(new BigDecimal("1000.00"))
                .creditNoteAmount(new BigDecimal("900.00"))
                .build();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");

        assertThatThrownBy(() -> invoiceService.generateCreditNote("inv-1", new BigDecimal("150.00"), "Operational mismatch"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Total value of credit notes cannot exceed original invoice total amount");

        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void generateCreditNote_equalOrLessThanInvoiceTotal_succeeds() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.DISPUTED)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .totalAmount(new BigDecimal("1000.00"))
                .creditNoteAmount(new BigDecimal("800.00"))
                .build();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice result = invoiceService.generateCreditNote("inv-1", new BigDecimal("200.00"), "Final settlement");

        assertThat(result.getCreditNoteAmount()).isEqualByComparingTo("1000.00");
        verify(invoiceRepository).save(invoice);
    }
}
