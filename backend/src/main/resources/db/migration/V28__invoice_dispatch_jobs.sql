CREATE TABLE invoice_dispatch_jobs (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL UNIQUE REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    status VARCHAR(20) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_invoice_dispatch_status
        CHECK (status IN ('QUEUED', 'GENERATING', 'FAILED', 'DELIVERED')),
    CONSTRAINT chk_invoice_dispatch_attempt_count CHECK (attempt_count >= 0)
);

CREATE INDEX idx_invoice_dispatch_jobs_tenant_status
    ON invoice_dispatch_jobs (tenant_id, status);
