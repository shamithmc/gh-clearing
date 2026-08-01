CREATE TABLE credit_notes (
    id VARCHAR(36) PRIMARY KEY,
    credit_note_number VARCHAR(64) NOT NULL,
    dispute_id VARCHAR(36) NOT NULL REFERENCES disputes(id),
    invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(id),
    original_invoice_number VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    airline_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    airport_code VARCHAR(10) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    xml_file_key VARCHAR(255) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    dispatch_error TEXT,
    CONSTRAINT uq_credit_notes_dispute UNIQUE (dispute_id),
    CONSTRAINT uq_credit_notes_number_supplier UNIQUE (credit_note_number, supplier_id),
    CONSTRAINT ck_credit_notes_amount_positive CHECK (amount > 0),
    CONSTRAINT ck_credit_notes_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_credit_notes_status CHECK (status IN ('GENERATED', 'DISPATCHED', 'DISPATCH_FAILED'))
);

CREATE INDEX idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX idx_credit_notes_supplier ON credit_notes(supplier_id, created_at DESC);
CREATE INDEX idx_credit_notes_airline ON credit_notes(airline_id, created_at DESC);
