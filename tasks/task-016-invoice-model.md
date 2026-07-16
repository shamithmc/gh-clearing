---
id: TASK-016
title: "Phase 3: Invoice Data Model & Lifecycle (3.1 & 3.7)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V9__invoice_schema.sql"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/domain/InvoiceLineItem.java"
  - "backend/src/main/java/com/airline/domain/InvoiceStatus.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceLineItemRepository.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceImmutabilityTest.java"
proof: UNIT
invariants:
  - INV-08
---

# TASK-016: Invoice Data Model & Lifecycle

Implements the base Invoice data model (Phase 3.1) and status transitions, ensuring that once an invoice is dispatched (SENT), its content becomes completely immutable (INV-08).
