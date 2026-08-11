package com.airline.api.dto;

import com.airline.domain.InvoiceDispatchJob;
import com.airline.domain.InvoiceDispatchStatus;

import java.time.OffsetDateTime;

public record InvoiceDispatchStatusResponse(
        String invoiceId,
        InvoiceDispatchStatus status,
        int attemptCount,
        String lastError,
        OffsetDateTime updatedAt,
        OffsetDateTime deliveredAt) {

    public static InvoiceDispatchStatusResponse from(InvoiceDispatchJob job) {
        return new InvoiceDispatchStatusResponse(
                job.getInvoiceId(),
                job.getStatus(),
                job.getAttemptCount(),
                job.getLastError(),
                job.getUpdatedAt(),
                job.getDeliveredAt());
    }
}
