CREATE TABLE IF NOT EXISTS contract_review_requests (
    id VARCHAR(50) PRIMARY KEY,
    contract_id VARCHAR(50) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL,
    airline_id VARCHAR(50) NOT NULL,
    comment VARCHAR(2000) NOT NULL,
    requested_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_review_requests_tenant_created
    ON contract_review_requests (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_review_requests_airline
    ON contract_review_requests (airline_id);
