-- V4__contracts_and_services.sql
-- Phase 2: Contracts & Pricing configurations

CREATE TABLE contracts (
    id VARCHAR(50) PRIMARY KEY,
    ground_handler_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL REFERENCES airports(iata_code) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- DRAFT, PENDING_APPROVAL, APPROVED, REVIEW_REQUESTED, EXPIRED
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    contract_id VARCHAR(50) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    charge_code VARCHAR(50) NOT NULL REFERENCES charge_codes(code) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    formula_type VARCHAR(10) NOT NULL, -- PF-01 to PF-07
    rate_details JSONB NOT NULL,
    quantity_driver VARCHAR(50) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
