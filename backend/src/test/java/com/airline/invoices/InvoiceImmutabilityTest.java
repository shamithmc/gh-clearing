package com.airline.invoices;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceRepository;
import com.airline.security.TenantContext;
import com.airline.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * INV-08: Dispatched Invoice Immutability
 * Verifies that once an invoice is dispatched (SENT, PAID, DISPUTED), its content becomes immutable.
 */
@ExtendWith(MockitoExtension.class)
public class InvoiceImmutabilityTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private TenantContext tenantContext;

    @InjectMocks
    private InvoiceService invoiceService;

    @Test
    void ghCanCreateDraftInvoice() {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("AED")
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .totalAmount(new BigDecimal("1500.00"))
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId("INV-100", "EK", "SWISSPORT"))
                .thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Invoice result = invoiceService.createInvoice(invoice);

        assertThat(result.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        verify(invoiceRepository).save(any(Invoice.class));
    }

    @Test
    void airlineCannotCreateInvoice() {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .build();

        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");

        assertThatThrownBy(() -> invoiceService.createInvoice(invoice))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only ground handlers can create invoices");
    }

    @Test
    void cannotModifyDispatchedInvoice_INV_08() {
        Invoice existing = Invoice.builder()
                .id("inv-001")
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .status(InvoiceStatus.SENT)
                .build();

        Invoice update = Invoice.builder()
                .invoiceNumber("INV-101")
                .build();

        when(invoiceRepository.findById("inv-001")).thenReturn(Optional.of(existing));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");

        assertThatThrownBy(() -> invoiceService.updateInvoice("inv-001", update))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Dispatched invoices are immutable and cannot be updated");
    }

    @Test
    void cannotDeleteDispatchedInvoice_INV_08() {
        Invoice existing = Invoice.builder()
                .id("inv-001")
                .invoiceNumber("INV-100")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .status(InvoiceStatus.PAID)
                .build();

        when(invoiceRepository.findById("inv-001")).thenReturn(Optional.of(existing));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");

        assertThatThrownBy(() -> invoiceService.deleteInvoice("inv-001"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Dispatched invoices are immutable and cannot be deleted");
    }
}
