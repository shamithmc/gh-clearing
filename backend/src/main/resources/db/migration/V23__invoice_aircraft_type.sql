ALTER TABLE invoice_line_items
    ADD COLUMN IF NOT EXISTS aircraft_type VARCHAR(50);
