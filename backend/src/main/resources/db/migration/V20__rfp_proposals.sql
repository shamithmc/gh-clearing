CREATE TABLE IF NOT EXISTS rfp_proposals (
    id VARCHAR(50) PRIMARY KEY,
    rfp_id VARCHAR(50) NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    proposed_rate NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    terms VARCHAR(4000) NOT NULL,
    status VARCHAR(30) NOT NULL,
    submitted_by VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rfp_proposal_supplier UNIQUE (rfp_id, tenant_id),
    CONSTRAINT chk_rfp_proposal_rate CHECK (proposed_rate > 0)
);

CREATE INDEX IF NOT EXISTS idx_rfp_proposals_tenant_submitted
    ON rfp_proposals (tenant_id, submitted_at DESC);
