ALTER TABLE invoices DROP COLUMN xml_document;
ALTER TABLE invoices DROP COLUMN pdf_document;

ALTER TABLE invoices ADD COLUMN xml_file_key VARCHAR(255);
ALTER TABLE invoices ADD COLUMN pdf_file_key VARCHAR(255);
