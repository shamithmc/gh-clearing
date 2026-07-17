---
id: TASK-020
title: "Phase 3: E2E Verification & Milestone Gates Setup"
owner: Shamith
paths:
  - "gates/phase-3-gate.json"
  - "e2e/tests/invoices.spec.ts"
  - "backend/src/main/java/com/airline/security/DevAuthFilter.java"
  - "backend/src/main/resources/db/migration/V9__invoice_schema.sql"
  - "e2e/playwright.config.ts"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/domain/InvoiceLineItem.java"
  - "frontend/src/pages/InvoiceWizard.tsx"
proof: E2E
invariants:
  - INV-08
---

# TASK-020: E2E Verification & Milestone Gates Setup

Implements Playwright browser E2E tests for Phase 3 Invoice creation, auto-calculation, and cross-currency validation flows, and configures a milestone validation gate.
