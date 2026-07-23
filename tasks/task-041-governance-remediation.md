---
id: TASK-041
title: "Restore development-contract governance controls"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-041-governance-remediation.md"
  - ".github/scripts/validate_work_unit.py"
  - ".github/scripts/validate_obligations.py"
  - ".github/scripts/validate_review_record.py"
  - ".github/scripts/validate_schema_provenance.py"
  - ".github/scripts/validate_gate_config.py"
  - ".github/workflows/ci.yml"
  - ".github/reviews/.gitkeep"
  - ".github/schemas/review-record.schema.json"
  - "backend/pom.xml"
  - "backend/src/main/java/com/airline/pricing/PricingEngine.java"
  - "backend/src/test/java/com/airline/pricing/PricingBoundaryCoverageTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "gates/phase-3-gate.json"
  - "gates/governance-recovery-gate.json"
  - "obligations.json"
  - "tasks/task-017-invoice-ui.md"
  - "tasks/task-018-calculations-and-validations.md"
  - "tasks/task-019-invoice-audit-trail.md"
  - "tasks/task-020-e2e-and-gates.md"
  - "tasks/task-021-invoice-approval.md"
  - "tasks/task-022-xml-pdf-dispatch.md"
  - "tasks/task-023-dispute-management.md"
  - "tasks/task-024-file-storage.md"
  - "tasks/task-025-background-processing.md"
  - "tasks/task-026-dashboards.md"
  - "tasks/task-027-airline-onboarding.md"
  - "tasks/task-028-airline-contract-viewer.md"
  - "tasks/task-029-contract-review-requests.md"
  - "tasks/task-030-airline-invoice-viewer.md"
  - "tasks/task-031-airline-payment-status.md"
  - "tasks/task-032-airline-abac-conformance.md"
  - "tasks/task-033-phase-6-notifications.md"
  - "tasks/task-034-airline-rfp-creation.md"
  - "tasks/task-035-supplier-rfp-response.md"
  - "tasks/task-036-airline-rfp-evaluation.md"
  - "tasks/task-037-service-provider-marketplace.md"
  - "tasks/task-038-supplier-rfp-summary.md"
  - "tasks/task-039-airline-review-request-summary.md"
  - "tasks/task-040-airport-cost-index.md"
  - "tasks/task-phases-1-5-conformance.md"
  - "tasks/task-reorg.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-04
  - INV-08
  - INV-09
  - INV-12
---

## Scope

Restores mechanical enforcement of the canonical development contract. This
work closes completed task artifacts, enforces work-unit lifecycle and locking,
validates review records and gate definitions, activates coverage enforcement,
and prevents an unverified local XML schema from satisfying an official IATA
conformance proof.

## Human acceptance requirements

- Independent codeowner approval is required because this task changes CI.
- Tech Lead acceptance is required because this is a Tier 3 governance change.
- The official IATA schema and its provenance metadata must be supplied through
  a separately reviewed authority change; this task does not alter that schema.
