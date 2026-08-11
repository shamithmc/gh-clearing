package com.airline.api.dto;

import com.airline.domain.DisputeAttachment;

import java.time.OffsetDateTime;

public record DisputeAttachmentResponse(
        String id,
        String disputeId,
        String originalFilename,
        String mediaType,
        long sizeBytes,
        String sha256,
        String uploaderTenantId,
        String uploaderUserId,
        OffsetDateTime uploadedAt,
        OffsetDateTime retentionUntil) {

    public static DisputeAttachmentResponse from(DisputeAttachment attachment) {
        return new DisputeAttachmentResponse(
                attachment.getId(),
                attachment.getDisputeId(),
                attachment.getOriginalFilename(),
                attachment.getMediaType(),
                attachment.getSizeBytes(),
                attachment.getSha256(),
                attachment.getUploaderTenantId(),
                attachment.getUploaderUserId(),
                attachment.getUploadedAt(),
                attachment.getRetentionUntil());
    }
}
