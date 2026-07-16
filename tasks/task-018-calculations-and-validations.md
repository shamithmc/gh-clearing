---
id: TASK-018
title: "Phase 3: Invoice Auto-Calculation & Validation (3.3 - 3.5)"
owner: Shamith
paths:
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceUniquenessTest.java"
  - "backend/src/test/java/com/airline/pricing/MtowLookupTest.java"
  - "backend/src/test/java/com/airline/invoices/CrossCurrencyValidationTest.java"
proof: UNIT
invariants:
  - INV-05
  - INV-06
  - INV-07
---

# TASK-018: Invoice Auto-Calculation & Validation

Implements auto-calculations (PF engines), cross-currency exchange rate mandates (INV-06), tail ID requirements (INV-05), and uniqueness validation rules (INV-07) when Ground Handlers save drafts or submit invoices.
