CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    airport_code VARCHAR(3) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10, 4),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    flight_date DATE NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    aircraft_reg VARCHAR(20) NOT NULL,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    charge_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    formula_type VARCHAR(10) NOT NULL,
    quantity_drivers VARCHAR(500) NOT NULL,
    calculated_amount DECIMAL(15, 2) NOT NULL,
    contract_id VARCHAR(50) REFERENCES contracts(id) ON DELETE SET NULL
);
