package com.airline.disputes;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.api.dto.LineItemDisputeRequest;
import com.airline.domain.*;
import com.airline.repository.InvoiceRepository;
import com.airline.service.InvoiceService;
import com.airline.security.TenantContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * INV-10: Dispute Line Item Constraint.
 * Verifies that an Airline user MUST NOT initiate a Dispute against an Invoice that is in DRAFT or FINALIZED status.
 */
@ExtendWith(MockitoExtension.class)
class DisputeValidationTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    @Test
    void disputeInvoice_inDraftStatus_fails() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.DRAFT)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .lineItems(new ArrayList<>())
                .build();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");

        InvoiceDisputeRequest request = new InvoiceDisputeRequest();
        LineItemDisputeRequest itemRequest = new LineItemDisputeRequest();
        itemRequest.setLineItemId("item-1");
        itemRequest.setCategory(DisputeCategory.MISCELLANEOUS);
        request.setLineItems(List.of(itemRequest));

        assertThatThrownBy(() -> invoiceService.disputeInvoice("inv-1", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot dispute invoices in DRAFT or FINALIZED status");

        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void disputeInvoice_inFinalizedStatus_fails() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.FINALIZED)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .lineItems(new ArrayList<>())
                .build();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");

        InvoiceDisputeRequest request = new InvoiceDisputeRequest();
        LineItemDisputeRequest itemRequest = new LineItemDisputeRequest();
        itemRequest.setLineItemId("item-1");
        itemRequest.setCategory(DisputeCategory.MISCELLANEOUS);
        request.setLineItems(List.of(itemRequest));

        assertThatThrownBy(() -> invoiceService.disputeInvoice("inv-1", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot dispute invoices in DRAFT or FINALIZED status");

        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void disputeInvoice_inApprovedStatus_fails() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .status(InvoiceStatus.APPROVED)
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .lineItems(new ArrayList<>())
                .build();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");

        InvoiceDisputeRequest request = new InvoiceDisputeRequest();
        LineItemDisputeRequest itemRequest = new LineItemDisputeRequest();
        itemRequest.setLineItemId("item-1");
        itemRequest.setCategory(DisputeCategory.MISCELLANEOUS);
        request.setLineItems(List.of(itemRequest));

        assertThatThrownBy(() -> invoiceService.disputeInvoice("inv-1", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only SENT invoices can be disputed");

        verify(invoiceRepository, never()).save(any());
    }
}
