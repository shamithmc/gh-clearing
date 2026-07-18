---
id: TASK-023
title: "Phase 4.6 & 9.1-9.5: Dispute Management & Verification"
owner: Shamith
paths:
  - "tasks/task-023-dispute-management.md"
  - "backend/src/main/resources/db/migration/V13__add_invoice_disputes.sql"
  - "backend/src/main/java/com/airline/domain/InvoiceLineItem.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "frontend/src/pages/InvoicesList.tsx"
  - "backend/src/test/java/com/airline/xml/IataXmlComplianceTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeValidationTest.java"
  - "backend/src/test/java/com/airline/disputes/CreditNoteValueLimitTest.java"
  - "e2e/tests/invoice-approval.spec.ts"
proof: INTEGRATION
invariants:
  - INV-10
  - INV-11
---

## Scope
Implements dispute flagging on specific invoice line items by airline users, enforcing INV-10 (cannot dispute DRAFT/FINALIZED) and INV-11 (credit notes <= original invoice total).
