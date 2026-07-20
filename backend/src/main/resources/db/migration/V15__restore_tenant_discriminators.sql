-- INV-01: tenant-owned aggregate roots use the canonical discriminator name.
-- Java domain names remain groundHandlerId/supplierId, but both map to tenant_id.
ALTER TABLE contracts RENAME COLUMN ground_handler_id TO tenant_id;
ALTER TABLE invoices RENAME COLUMN supplier_id TO tenant_id;
