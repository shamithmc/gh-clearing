package com.airline.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "dispute_attachments")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisputeAttachment {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "dispute_id", nullable = false, length = 36)
    private String disputeId;

    @Column(name = "uploader_tenant_id", nullable = false, length = 50)
    private String uploaderTenantId;

    @Column(name = "uploader_user_id", nullable = false, length = 100)
    private String uploaderUserId;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "media_type", nullable = false, length = 50)
    private String mediaType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false, length = 64, columnDefinition = "CHAR(64)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String sha256;

    @Column(name = "storage_key", nullable = false, unique = true, length = 500)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_status", nullable = false, length = 20)
    private DisputeAttachmentScanStatus scanStatus;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    @Column(name = "retention_until", nullable = false)
    private OffsetDateTime retentionUntil;

    @PrePersist
    void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = OffsetDateTime.now();
        }
    }
}
