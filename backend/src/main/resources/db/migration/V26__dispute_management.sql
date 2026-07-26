-- V26: Dispute Management Table & Message Thread Schema
CREATE TABLE disputes (
    id VARCHAR(36) PRIMARY KEY,
    dispute_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id VARCHAR(36) NOT NULL REFERENCES invoices(id),
    invoice_number VARCHAR(50) NOT NULL,
    airline_id VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL,
    airport_code VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    disputed_amount DECIMAL(15, 2) NOT NULL,
    credit_note_amount DECIMAL(15, 2) DEFAULT 0.00,
    initiator_comment TEXT,
    latest_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispute_line_items (
    id VARCHAR(36) PRIMARY KEY,
    dispute_id VARCHAR(36) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    line_item_id VARCHAR(36) NOT NULL,
    charge_code VARCHAR(50) NOT NULL,
    disputed_amount DECIMAL(15, 2) NOT NULL,
    reason TEXT
);

CREATE TABLE dispute_messages (
    id VARCHAR(36) PRIMARY KEY,
    dispute_id VARCHAR(36) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_tenant_id VARCHAR(50) NOT NULL,
    sender_tenant_type VARCHAR(50) NOT NULL,
    sender_user_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    action VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disputes_airline ON disputes(airline_id);
CREATE INDEX idx_disputes_supplier ON disputes(supplier_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_invoice ON disputes(invoice_id);
