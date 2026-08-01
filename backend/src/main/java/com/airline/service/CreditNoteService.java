package com.airline.service;

import com.airline.domain.*;
import com.airline.repository.CreditNoteRepository;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.xml.CreditNoteXmlGeneratorService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class CreditNoteService {
    private final CreditNoteRepository creditNoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceAuditLogRepository auditLogRepository;
    private final CreditNoteXmlGeneratorService xmlGenerator;
    private final FileStorageService fileStorageService;
    private final CreditNoteDispatchService dispatchService;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public CreditNoteService(
            CreditNoteRepository creditNoteRepository,
            InvoiceRepository invoiceRepository,
            InvoiceAuditLogRepository auditLogRepository,
            CreditNoteXmlGeneratorService xmlGenerator,
            FileStorageService fileStorageService,
            CreditNoteDispatchService dispatchService,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.creditNoteRepository = creditNoteRepository;
        this.invoiceRepository = invoiceRepository;
        this.auditLogRepository = auditLogRepository;
        this.xmlGenerator = xmlGenerator;
        this.fileStorageService = fileStorageService;
        this.dispatchService = dispatchService;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional
    public CreditNote generateForAcceptedDispute(Dispute dispute, String reason) {
        if (dispute.getDisputedAmount() == null || dispute.getDisputedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit note amount must be positive");
        }
        CreditNote existing = creditNoteRepository
                .findByDisputeIdAndSupplierId(dispute.getId(), dispute.getSupplierId())
                .orElse(null);
        if (existing != null) {
            return existing;
        }

        Invoice invoice = invoiceRepository
                .findByIdAndSupplierIdForUpdate(dispute.getInvoiceId(), dispute.getSupplierId())
                .orElseThrow(() -> new NoSuchElementException("Invoice not found: " + dispute.getInvoiceId()));
        if (!invoice.getAirlineId().equals(dispute.getAirlineId())) {
            throw new IllegalStateException("Dispute parties do not match the original invoice");
        }

        BigDecimal issued = creditNoteRepository.sumAmountByInvoiceIdAndSupplierId(
                invoice.getId(), invoice.getSupplierId());
        BigDecimal cumulative = issued.add(dispute.getDisputedAmount());
        if (cumulative.compareTo(invoice.getTotalAmount()) > 0) {
            throw new IllegalArgumentException(
                    "Total value of credit notes cannot exceed original invoice total amount");
        }

        CreditNote note = CreditNote.builder()
                .id(UUID.randomUUID().toString())
                .creditNoteNumber("CN-" + dispute.getId().toUpperCase())
                .disputeId(dispute.getId())
                .invoiceId(invoice.getId())
                .originalInvoiceNumber(invoice.getInvoiceNumber())
                .supplierId(invoice.getSupplierId())
                .airlineId(invoice.getAirlineId())
                .airportCode(invoice.getAirportCode())
                .currency(invoice.getCurrency())
                .amount(dispute.getDisputedAmount())
                .reason(reason)
                .status(CreditNoteStatus.GENERATED)
                .createdBy(currentUserId())
                .build();

        byte[] xml = xmlGenerator.generate(note, dispute);
        String key = fileStorageService.store(note.getCreditNoteNumber() + ".xml", xml);
        note.setXmlFileKey(key);
        invoice.setCreditNoteAmount(cumulative);
        invoiceRepository.save(invoice);

        try {
            if (dispatchService.dispatch(note, xml)) {
                note.setStatus(CreditNoteStatus.DISPATCHED);
                note.setDispatchedAt(OffsetDateTime.now());
            }
        } catch (RuntimeException exception) {
            note.setStatus(CreditNoteStatus.DISPATCH_FAILED);
            note.setDispatchError(truncate(exception.getMessage(), 1000));
        }

        CreditNote saved = creditNoteRepository.save(note);
        auditLogRepository.save(InvoiceAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .invoiceId(invoice.getId())
                .action("CREDIT_NOTE_" + saved.getStatus().name())
                .userId(currentUserId())
                .comments(saved.getCreditNoteNumber() + " amount " + saved.getAmount())
                .build());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CreditNote> listForCurrentTenant() {
        String tenantId = tenantContext.getCurrentTenantId();
        List<CreditNote> notes = creditNoteRepository.findAllByTenantId(tenantId);
        notes.forEach(this::verifyDimensions);
        return notes;
    }

    @Transactional(readOnly = true)
    public CreditNote getForCurrentTenant(String id) {
        CreditNote note = creditNoteRepository.findByIdAndTenantId(id, tenantContext.getCurrentTenantId())
                .orElseThrow(() -> new NoSuchElementException("Credit note not found: " + id));
        verifyDimensions(note);
        return note;
    }

    public byte[] loadXml(CreditNote note) {
        return fileStorageService.load(note.getXmlFileKey());
    }

    private void verifyDimensions(CreditNote note) {
        dimensionalSecurityEvaluator.verifyAccess(
                note.getAirportCode(), note.getAirlineId(), java.util.Set.of());
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "system" : authentication.getName();
    }

    private String truncate(String value, int length) {
        if (value == null || value.length() <= length) {
            return value;
        }
        return value.substring(0, length);
    }
}
