CREATE TABLE IF NOT EXISTS rfps (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    airport_code VARCHAR(3) NOT NULL REFERENCES airports(iata_code),
    service_type VARCHAR(50) NOT NULL REFERENCES charge_codes(code),
    requirements VARCHAR(4000) NOT NULL,
    desired_start_date DATE NOT NULL,
    desired_end_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rfp_period CHECK (desired_end_date >= desired_start_date),
    CONSTRAINT chk_rfp_airline_owner CHECK (tenant_id = airline_id)
);

CREATE INDEX IF NOT EXISTS idx_rfps_tenant_created
    ON rfps (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rfp_eligible_ground_handlers (
    rfp_id VARCHAR(50) NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    ground_handler_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    PRIMARY KEY (rfp_id, ground_handler_id)
);

CREATE INDEX IF NOT EXISTS idx_rfp_eligible_ground_handler
    ON rfp_eligible_ground_handlers (ground_handler_id, rfp_id);
