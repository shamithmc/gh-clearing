---
id: TASK-021
title: "Phase 4.1: Invoice Approval Workflow"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V11__add_invoice_approval_fields.sql"
  - "backend/src/main/java/com/airline/domain/InvoiceStatus.java"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/domain/InvoiceAuditLog.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "frontend/src/pages/InvoicesList.tsx"
  - "e2e/tests/invoice-approval.spec.ts"
  - "tasks/task-021-invoice-approval.md"
  - ".gitignore"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceUniquenessTest.java"
  - "backend/src/test/java/com/airline/pricing/MtowLookupTest.java"
proof: INTEGRATION
invariants:
  - INV-08
---

# TASK-021: Phase 4.1: Invoice Approval Workflow

Implements the counter-party review and approval workflow for finalized invoices. Enables marking invoices as APPROVED or MODIFICATION_REQUESTED with comments.
