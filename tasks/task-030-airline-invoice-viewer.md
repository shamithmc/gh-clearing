---
id: TASK-030
title: "Phase 6.5: Airline Invoice Viewer"
owner: Shamith
paths:
  - "tasks/task-030-airline-invoice-viewer.md"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/test/java/com/airline/api/InvoiceControllerTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlineInvoiceViewerTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "frontend/src/pages/AirlineInvoices.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "e2e/tests/airline-invoices.spec.ts"
  - "e2e/tests/invoice-approval.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-08
  - INV-09
---

## Scope

Implements Phase 6.5 airline invoice viewing. Airline invoice reviewers can
view only dispatched invoices belonging to their tenant and dimensional scope,
filter by airport, service type, and status, inspect line items, and download
the generated IS-XML and PDF documents. Supplier invoice entry and approval
remain separate from the read-only airline workspace.
