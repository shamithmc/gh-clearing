ALTER TABLE invoices ADD COLUMN xml_document BYTEA;
ALTER TABLE invoices ADD COLUMN pdf_document BYTEA;
ALTER TABLE invoices ADD COLUMN xml_generated_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN pdf_generated_at TIMESTAMP;
