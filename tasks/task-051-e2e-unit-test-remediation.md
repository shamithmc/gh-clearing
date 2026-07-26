---
id: TASK-051
title: "Post-Phase 9 E2E & Frontend Component Unit Test Remediation"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-051-e2e-unit-test-remediation.md"
  - "dependency-allowlist.json"
  - "e2e/playwright.config.ts"
  - "e2e/tests/airline-rfp-evaluation.spec.ts"
  - "e2e/tests/contracts.spec.ts"
  - "e2e/tests/dispute-management.spec.ts"
  - "e2e/tests/invoice-approval.spec.ts"
  - "e2e/tests/invoices.spec.ts"
  - "frontend/package.json"
  - "frontend/package-lock.json"
  - "frontend/vite.config.ts"
  - "frontend/tsconfig.json"
  - "frontend/src/test/setup.ts"
  - "frontend/src/pages/__tests__/DisputeDetailModal.test.tsx"
  - "frontend/src/pages/__tests__/InvoiceEntryWizard.test.tsx"
proof: E2E
invariants:
  - INV-01
  - INV-10
  - INV-11
  - INV-12
---

## Scope

1. **Task 1: Refactor Phase 9 E2E Dispute Management Spec** (`e2e/tests/dispute-management.spec.ts`)
2. **Task 2: Implement Dispute Acceptance & Credit Note XML E2E Workflow** (`e2e/tests/dispute-management.spec.ts`)
3. **Task 3: Implement Initial Frontend Component Unit Tests** (`frontend/src/test/setup.ts`, `frontend/src/pages/__tests__/`)
4. **Task 4: Expand Contract Wizard E2E Spec for Dynamic Pricing Formulas (PF-03 to PF-07)** (`e2e/tests/contracts.spec.ts`)
5. **Task 5: E2E Verification for Async Document Generation & S3 Storage** (`e2e/tests/invoice-approval.spec.ts`)
6. **Task 6: E2E Verification for Sent / Approved Invoice UI Immutability** (`e2e/tests/invoices.spec.ts`)
7. **Task 7: E2E Spec for RFP Proposal Acceptance & Contract Auto-Seeding** (`e2e/tests/airline-rfp-evaluation.spec.ts`)
