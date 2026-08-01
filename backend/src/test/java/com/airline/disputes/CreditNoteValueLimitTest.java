package com.airline.disputes;

import com.airline.domain.*;
import com.airline.repository.CreditNoteRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.*;
import com.airline.xml.CreditNoteXmlGeneratorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** INV-11: the locked persisted sum, not a client-supplied balance, controls issuance. */
@ExtendWith(MockitoExtension.class)
class CreditNoteValueLimitTest {
    @Mock CreditNoteRepository creditNoteRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock InvoiceAuditLogRepository auditLogRepository;
    @Mock CreditNoteXmlGeneratorService xmlGenerator;
    @Mock FileStorageService fileStorageService;
    @Mock CreditNoteDispatchService dispatchService;
    @Mock TenantContext tenantContext;
    @Mock DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private CreditNoteService service;

    @BeforeEach
    void setUp() {
        service = new CreditNoteService(
                creditNoteRepository, invoiceRepository, auditLogRepository, xmlGenerator,
                fileStorageService, dispatchService, tenantContext, dimensionalSecurityEvaluator);
    }

    @Test
    void cumulativePersistedAmountExceedingInvoiceTotalFailsWhileHoldingInvoiceLock() {
        Dispute dispute = dispute("150.00");
        when(creditNoteRepository.findByDisputeIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.empty());
        when(invoiceRepository.findByIdAndSupplierIdForUpdate("inv-1", "SWISSPORT"))
                .thenReturn(Optional.of(invoice()));
        when(creditNoteRepository.sumAmountByInvoiceIdAndSupplierId("inv-1", "SWISSPORT"))
                .thenReturn(new BigDecimal("900.00"));

        assertThatThrownBy(() -> service.generateForAcceptedDispute(dispute, "Accepted"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot exceed original invoice total");

        verify(invoiceRepository, never()).save(any());
        verifyNoInteractions(xmlGenerator, fileStorageService, dispatchService);
    }

    @Test
    void validAmountCreatesValidatedStoredDispatchedAggregateAndUpdatesCachedTotal() {
        Dispute dispute = dispute("200.00");
        Invoice invoice = invoice();
        when(creditNoteRepository.findByDisputeIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.empty());
        when(invoiceRepository.findByIdAndSupplierIdForUpdate("inv-1", "SWISSPORT"))
                .thenReturn(Optional.of(invoice));
        when(creditNoteRepository.sumAmountByInvoiceIdAndSupplierId("inv-1", "SWISSPORT"))
                .thenReturn(new BigDecimal("800.00"));
        when(xmlGenerator.generate(any(CreditNote.class), same(dispute))).thenReturn("<xml/>".getBytes());
        when(fileStorageService.store(anyString(), any())).thenReturn("credit-note.xml");
        when(dispatchService.dispatch(any(CreditNote.class), any())).thenReturn(true);
        when(creditNoteRepository.save(any(CreditNote.class))).thenAnswer(call -> call.getArgument(0));
        when(auditLogRepository.save(any(InvoiceAuditLog.class))).thenAnswer(call -> call.getArgument(0));

        CreditNote note = service.generateForAcceptedDispute(dispute, "Accepted");

        assertThat(note.getOriginalInvoiceNumber()).isEqualTo("INV-1");
        assertThat(note.getAmount()).isEqualByComparingTo("200.00");
        assertThat(note.getStatus()).isEqualTo(CreditNoteStatus.DISPATCHED);
        assertThat(note.getXmlFileKey()).isEqualTo("credit-note.xml");
        assertThat(invoice.getCreditNoteAmount()).isEqualByComparingTo("1000.00");
        verify(invoiceRepository).findByIdAndSupplierIdForUpdate("inv-1", "SWISSPORT");
        verify(auditLogRepository).save(any(InvoiceAuditLog.class));
    }

    @Test
    void repeatedGenerationForSameDisputeIsIdempotent() {
        Dispute dispute = dispute("200.00");
        CreditNote existing = CreditNote.builder().id("cn-1").amount(new BigDecimal("200.00")).build();
        when(creditNoteRepository.findByDisputeIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.of(existing));

        assertThat(service.generateForAcceptedDispute(dispute, "Accepted")).isSameAs(existing);

        verifyNoInteractions(invoiceRepository, xmlGenerator, fileStorageService, dispatchService);
    }

    @Test
    void dispatchFailureIsPersistedAsEvidenceWithoutLosingIssuedDocument() {
        Dispute dispute = dispute("100.00");
        Invoice invoice = invoice();
        when(creditNoteRepository.findByDisputeIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.empty());
        when(invoiceRepository.findByIdAndSupplierIdForUpdate("inv-1", "SWISSPORT"))
                .thenReturn(Optional.of(invoice));
        when(creditNoteRepository.sumAmountByInvoiceIdAndSupplierId("inv-1", "SWISSPORT"))
                .thenReturn(BigDecimal.ZERO);
        when(xmlGenerator.generate(any(CreditNote.class), same(dispute))).thenReturn("<xml/>".getBytes());
        when(fileStorageService.store(anyString(), any())).thenReturn("credit-note.xml");
        when(dispatchService.dispatch(any(CreditNote.class), any()))
                .thenThrow(new IllegalStateException("SMTP unavailable"));
        when(creditNoteRepository.save(any(CreditNote.class))).thenAnswer(call -> call.getArgument(0));
        when(auditLogRepository.save(any(InvoiceAuditLog.class))).thenAnswer(call -> call.getArgument(0));

        CreditNote note = service.generateForAcceptedDispute(dispute, "Accepted");

        assertThat(note.getStatus()).isEqualTo(CreditNoteStatus.DISPATCH_FAILED);
        assertThat(note.getDispatchError()).contains("SMTP unavailable");
        assertThat(note.getXmlFileKey()).isEqualTo("credit-note.xml");
    }

    private Invoice invoice() {
        return Invoice.builder()
                .id("inv-1")
                .invoiceNumber("INV-1")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("USD")
                .totalAmount(new BigDecimal("1000.00"))
                .creditNoteAmount(new BigDecimal("800.00"))
                .build();
    }

    private Dispute dispute(String amount) {
        return Dispute.builder()
                .id("dispute-1")
                .disputeNumber("DSP-1")
                .invoiceId("inv-1")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .disputedAmount(new BigDecimal(amount))
                .build();
    }
}
