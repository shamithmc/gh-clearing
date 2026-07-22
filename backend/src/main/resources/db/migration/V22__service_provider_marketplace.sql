CREATE TABLE service_offerings (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    airport_code VARCHAR(3) NOT NULL REFERENCES airports(iata_code),
    service_type VARCHAR(50) NOT NULL REFERENCES charge_codes(code),
    description VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_service_offering UNIQUE (tenant_id, airport_code, service_type)
);

CREATE INDEX idx_service_offerings_airport_service
    ON service_offerings (airport_code, service_type);
