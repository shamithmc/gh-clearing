---
id: TASK-073
title: "Status-Contextual Remarks and Feedback for Invoices and Contracts"
owner: Shamith
state: REVIEW
paths:
  - "e2e/tests/pricing-benchmark.spec.ts"
  - "frontend/src/pages/AirlineInvoices.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "tasks/task-contextual-invoice-contract-feedback.md"
proof: E2E
invariants:
  - INV-01
  - INV-02
---

## Scope

1. **Status-Contextual Invoice Remarks UX**:
   - Replaced static `"Modification Request Feedback"` banner in `InvoicesList.tsx` and `AirlineInvoices.tsx` with dynamic, status-aware headings, icons, and contextual color-coding:
     - `MODIFICATION_REQUESTED`: **Modification Request Feedback** (Amber banner with `AlertTriangle`)
     - `DISPUTED`: **Dispute & Audit Remarks** (Rose banner with `Scale`)
     - `APPROVED`: **Approval Remarks** (Emerald banner with `CheckCircle2`)
     - `SENT`: **Dispatch & Delivery Remarks** (Blue banner with `Send`)
     - `PAID`: **Payment & Settlement Remarks** (Emerald banner with `CheckCircle2`)
     - `DRAFT` / `FINALIZED` / default: **Invoice Remarks & Notes** (Slate banner with `FileText`)

2. **Contract Review Feedback Visibility**:
   - Added a `Carrier Review Requested` alert banner in `ContractsList.tsx` expanded row view when a contract is in `REVIEW_REQUESTED` status to guide the ground handler to the review queue.

3. **E2E Test Hardening**:
   - Updated `e2e/tests/pricing-benchmark.spec.ts` with async dispatch completion polling and explicit option content selection.
