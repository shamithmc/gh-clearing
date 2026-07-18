ALTER TABLE invoice_line_items ADD COLUMN disputed BOOLEAN DEFAULT FALSE;
ALTER TABLE invoice_line_items ADD COLUMN dispute_category VARCHAR(50);
ALTER TABLE invoice_line_items ADD COLUMN dispute_comment VARCHAR(500);

ALTER TABLE invoices ADD COLUMN credit_note_amount DECIMAL(15, 2) DEFAULT 0.00;
