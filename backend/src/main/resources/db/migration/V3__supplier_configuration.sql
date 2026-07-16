-- V3__supplier_configuration.sql
-- Phase 1: Supplier Configuration schema

CREATE TABLE IF NOT EXISTS supplier_configurations (
    tenant_id VARCHAR(50) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    email_ids VARCHAR(255),
    invoice_backdating_days INT NOT NULL DEFAULT 30,
    regional_classification VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_enabled_airlines (
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airline_id VARCHAR(2) NOT NULL REFERENCES airlines(iata_code) ON DELETE CASCADE,
    PRIMARY KEY (tenant_id, airline_id)
);

CREATE TABLE IF NOT EXISTS supplier_enabled_airports (
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL REFERENCES airports(iata_code) ON DELETE CASCADE,
    PRIMARY KEY (tenant_id, airport_code)
);
