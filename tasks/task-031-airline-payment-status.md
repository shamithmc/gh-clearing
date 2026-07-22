---
id: TASK-031
title: "Phase 6.6: Airline Payment Status"
owner: Shamith
paths:
  - "tasks/task-031-airline-payment-status.md"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/test/java/com/airline/invoices/AirlinePaymentStatusTest.java"
  - "frontend/src/pages/AirlineInvoices.tsx"
  - "e2e/tests/airline-invoices.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-08
---

## Scope

Implements Phase 6.6 airline payment status. Airline users with the
`PAYMENT_UPDATER` role can mark only their own dimension-authorized `SENT` or
`DISPUTED` invoices as `PAID`. The transition is audit logged, does not modify
dispatched invoice content, and is immediately visible in the supplier invoice
view.
