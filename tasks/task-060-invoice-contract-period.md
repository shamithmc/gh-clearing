---
id: TASK-060
title: "Validate invoice flight dates against contracts"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-060-invoice-contract-period.md"
  - "tasks/task-059-governance-mechanics.md"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/test/java/com/airline/contracts/InvoiceContractPeriodValidationTest.java"
  - "backend/src/test/java/com/airline/invoices/CrossCurrencyValidationTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "backend/src/test/java/com/airline/pricing/MtowLookupTest.java"
proof: UNIT
invariants:
  - INV-03
  - INV-05
  - INV-07
  - INV-08
  - INV-12
---

## Scope

1. Require every invoice line item to declare a flight date.
2. Validate each flight date against the referenced contract's inclusive start and end dates.
3. Apply the same rule to invoice creation and draft updates.
4. Prove boundary acceptance and rejection of missing, pre-contract, post-contract, and mixed-validity line items before persistence.
5. Close merged task 059 under the work-unit lifecycle.
