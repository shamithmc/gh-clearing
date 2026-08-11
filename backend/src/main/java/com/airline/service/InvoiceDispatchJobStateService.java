package com.airline.service;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceAuditLog;
import com.airline.domain.InvoiceDispatchJob;
import com.airline.domain.InvoiceDispatchStatus;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceAuditLogRepository;
import com.airline.repository.InvoiceDispatchJobRepository;
import com.airline.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class InvoiceDispatchJobStateService {

    private static final int MAX_ERROR_LENGTH = 2000;

    private final InvoiceDispatchJobRepository jobRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceAuditLogRepository auditLogRepository;

    public InvoiceDispatchJobStateService(
            InvoiceDispatchJobRepository jobRepository,
            InvoiceRepository invoiceRepository,
            InvoiceAuditLogRepository auditLogRepository) {
        this.jobRepository = jobRepository;
        this.invoiceRepository = invoiceRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public InvoiceDispatchJob queue(Invoice invoice) {
        InvoiceDispatchJob job = jobRepository
                .findByInvoiceIdAndTenantIdForUpdate(invoice.getId(), invoice.getSupplierId())
                .orElseGet(() -> InvoiceDispatchJob.builder()
                        .id(UUID.randomUUID().toString())
                        .invoiceId(invoice.getId())
                        .tenantId(invoice.getSupplierId())
                        .status(InvoiceDispatchStatus.QUEUED)
                        .build());

        if (job.getStatus() == InvoiceDispatchStatus.FAILED) {
            job.setStatus(InvoiceDispatchStatus.QUEUED);
            job.setLastError(null);
        }
        return jobRepository.save(job);
    }

    @Transactional(readOnly = true)
    public Optional<InvoiceDispatchJob> find(String invoiceId, String tenantId) {
        return jobRepository.findByInvoiceIdAndTenantId(invoiceId, tenantId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claim(String invoiceId, String tenantId) {
        InvoiceDispatchJob job = jobRepository
                .findByInvoiceIdAndTenantIdForUpdate(invoiceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice dispatch job not found: " + invoiceId));
        if (job.getStatus() != InvoiceDispatchStatus.QUEUED) {
            return false;
        }
        job.setStatus(InvoiceDispatchStatus.GENERATING);
        job.setAttemptCount(job.getAttemptCount() + 1);
        job.setLastError(null);
        jobRepository.save(job);
        audit(invoiceId, "DISPATCH_GENERATING", "Attempt " + job.getAttemptCount());
        return true;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markDelivered(
            String invoiceId,
            String tenantId,
            String xmlKey,
            String pdfKey,
            LocalDateTime generatedAt) {
        InvoiceDispatchJob job = jobRepository
                .findByInvoiceIdAndTenantIdForUpdate(invoiceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice dispatch job not found: " + invoiceId));
        if (job.getStatus() == InvoiceDispatchStatus.DELIVERED) {
            return;
        }
        if (job.getStatus() != InvoiceDispatchStatus.GENERATING) {
            throw new IllegalStateException("Invoice dispatch job is not GENERATING: " + invoiceId);
        }

        Invoice invoice = invoiceRepository.findByIdAndSupplierIdForUpdate(invoiceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));
        if (invoice.getStatus() != InvoiceStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED invoices can complete dispatch");
        }

        invoice.setXmlFileKey(xmlKey);
        invoice.setPdfFileKey(pdfKey);
        invoice.setXmlGeneratedAt(generatedAt);
        invoice.setPdfGeneratedAt(generatedAt);
        invoice.setStatus(InvoiceStatus.SENT);
        invoiceRepository.save(invoice);

        OffsetDateTime deliveredAt = OffsetDateTime.now();
        job.setStatus(InvoiceDispatchStatus.DELIVERED);
        job.setLastError(null);
        job.setDeliveredAt(deliveredAt);
        jobRepository.save(job);
        audit(invoiceId, "DISPATCH_DELIVERED", "Delivered on attempt " + job.getAttemptCount());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String invoiceId, String tenantId, Throwable failure) {
        InvoiceDispatchJob job = jobRepository
                .findByInvoiceIdAndTenantIdForUpdate(invoiceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice dispatch job not found: " + invoiceId));
        if (job.getStatus() == InvoiceDispatchStatus.DELIVERED) {
            return;
        }
        String error = actionableError(failure);
        job.setStatus(InvoiceDispatchStatus.FAILED);
        job.setLastError(error);
        jobRepository.save(job);
        audit(invoiceId, "DISPATCH_FAILED", error);
    }

    private String actionableError(Throwable failure) {
        String type = failure == null ? "UnknownFailure" : failure.getClass().getSimpleName();
        String message = failure == null ? "Unknown dispatch failure" : failure.getMessage();
        String combined = type + ": " + (message == null || message.isBlank() ? "No error message" : message);
        return combined.length() <= MAX_ERROR_LENGTH ? combined : combined.substring(0, MAX_ERROR_LENGTH);
    }

    private void audit(String invoiceId, String action, String comments) {
        auditLogRepository.save(InvoiceAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .invoiceId(invoiceId)
                .action(action)
                .userId("SYSTEM")
                .comments(comments.length() <= 1000 ? comments : comments.substring(0, 1000))
                .timestamp(OffsetDateTime.now())
                .build());
    }
}
