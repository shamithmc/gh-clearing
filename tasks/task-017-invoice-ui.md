---
id: TASK-017
title: "Phase 3.2: Invoice Entry UI"
owner: Shamith
paths:
  - "frontend/src/App.tsx"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "tasks/task-017-invoice-ui.md"
proof: COMPILER
invariants:
  - INV-08
---

# TASK-017: Invoice Entry UI

Builds the React frontend wizard/form for invoice creation by ground handlers:
- Allows selecting an Airline and Airport.
- Fetches services from approved contracts for the selected Airline and Airport to use as options.
- Collects header details (Invoice Number, Currency, Exchange Rate, Issue Date, Due Date).
- Supports adding flight line items dynamically (Flight Date, Flight Number, Aircraft Reg, Origin, Destination, selected contract service/charge code, and quantity/drivers).
- Displays a preview summary before posting to `POST /api/invoices`.
