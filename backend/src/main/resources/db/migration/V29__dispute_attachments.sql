CREATE TABLE dispute_attachments (
    id VARCHAR(36) PRIMARY KEY,
    dispute_id VARCHAR(36) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploader_tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    uploader_user_id VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    scan_status VARCHAR(20) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_dispute_attachment_media_type
        CHECK (media_type IN ('application/pdf', 'image/png', 'image/jpeg')),
    CONSTRAINT chk_dispute_attachment_size CHECK (size_bytes > 0),
    CONSTRAINT chk_dispute_attachment_scan_status CHECK (scan_status = 'CLEAN'),
    CONSTRAINT chk_dispute_attachment_retention
        CHECK (retention_until > uploaded_at)
);

CREATE INDEX idx_dispute_attachments_dispute
    ON dispute_attachments (dispute_id, uploaded_at);

CREATE INDEX idx_dispute_attachments_tenant
    ON dispute_attachments (uploader_tenant_id, uploaded_at);
