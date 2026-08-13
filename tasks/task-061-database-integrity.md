---
id: TASK-061
title: "Enforce database integrity controls"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-061-database-integrity.md"
  - "tasks/task-060-invoice-contract-period.md"
  - "backend/src/main/resources/db/migration/V30__database_integrity_controls.sql"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/test/java/com/airline/dispatch/InvoiceDispatchWorkflowIntegrationTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeAttachmentIntegrationTest.java"
  - "backend/src/test/java/com/airline/security/DatabaseIntegrityControlsTest.java"
  - "backend/src/test/java/com/airline/security/MarketIntelligenceTenantBoundaryTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-08
  - INV-10
  - INV-11
  - INV-12
---

## Scope

1. Add tenant, airport, and invoice-line relational constraints to dispute records.
2. Close database vocabularies for invoice/dispute statuses, dispute categories/actions, and message tenant types.
3. Enforce non-negative and bounded invoice, dispute, line-item, and credit-note amounts.
4. Verify dispute and credit-note identities against their referenced invoices.
5. Serialize direct credit-note writes on the invoice row and cap their cumulative total.
6. Make dispatched invoice billing content and billing line content immutable while preserving legitimate workflow metadata updates.
7. Prove the controls against PostgreSQL and close merged task 060.

## Authority acceptance

The user approved the forward-only V30 schema and security-rule change before implementation.

## Exclusion

Database row-level security remains separate until the application establishes a
safe, transaction-scoped tenant identity in every database session.
