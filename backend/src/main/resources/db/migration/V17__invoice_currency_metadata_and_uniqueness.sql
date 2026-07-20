ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate_source VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_supplier_airline_number
    ON invoices (tenant_id, airline_id, invoice_number);
