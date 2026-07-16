-- V1__init_schema.sql
-- Baseline schema initialization for Airline Ground Handling Cost Management Platform

-- 1. Tenants Table (Multi-tenant organizations partition)
CREATE TABLE tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- GROUND_HANDLER, AIRLINE, PLATFORM_ADMIN
    status VARCHAR(20) NOT NULL, -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    roles VARCHAR(255) NOT NULL, -- Comma-separated list of roles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Contracts Table
CREATE TABLE contracts (
    id VARCHAR(50) PRIMARY KEY,
    ground_handler_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- DRAFT, PENDING_APPROVAL, APPROVED, REVIEW_REQUESTED, EXPIRED
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Services (Contract-specific pricing configurations)
CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    contract_id VARCHAR(50) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    charge_code VARCHAR(50) NOT NULL, -- IATA standard charge codes
    service_name VARCHAR(100) NOT NULL,
    formula_type VARCHAR(10) NOT NULL, -- PF-01 to PF-07
    rate_details JSONB NOT NULL, -- Rate schema specific to formula
    quantity_driver VARCHAR(50) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Operational Flights (Flight service delivery metrics)
CREATE TABLE operational_flights (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    flight_number VARCHAR(10) NOT NULL,
    flight_date DATE NOT NULL,
    tail_id VARCHAR(10) NOT NULL,
    departure_airport VARCHAR(3) NOT NULL,
    destination_airport VARCHAR(3) NOT NULL,
    quantity_drivers JSONB NOT NULL, -- Captures actual values for quantity drivers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Invoices Table
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL, -- DRAFT, FINALIZED, APPROVED, SENT, PAID, DISPUTED
    due_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,6),
    exchange_rate_source VARCHAR(100),
    invoice_period_start DATE NOT NULL,
    invoice_period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_invoice_number UNIQUE (tenant_id, invoice_number)
);

-- 7. Invoice Line Items Table
CREATE TABLE invoice_lines (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    flight_id VARCHAR(50) NOT NULL REFERENCES operational_flights(id) ON DELETE RESTRICT,
    service_id VARCHAR(50) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    calculated_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Disputes Table (Level 3 billing objections)
CREATE TABLE disputes (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- OPERATIONAL_DATA_MISMATCH, etc.
    status VARCHAR(20) NOT NULL, -- OPEN, UNDER_REVIEW, RESPONDED, ACCEPTED, REJECTED, ESCALATED
    comments TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Credit Notes Table
CREATE TABLE credit_notes (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dispute_id VARCHAR(50) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- DRAFT, APPROVED, SENT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
