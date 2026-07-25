---
id: TASK-050
title: "Phase 9 — Dispute Management, Structured Workflow, Credit Note Generation & MIS Summaries"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-050-dispute-management.md"
  - "obligations.json"
  - "backend/src/main/resources/db/migration/V26__dispute_management.sql"
  - "backend/src/main/java/com/airline/domain/Dispute.java"
  - "backend/src/main/java/com/airline/domain/DisputeLineItem.java"
  - "backend/src/main/java/com/airline/domain/DisputeMessage.java"
  - "backend/src/main/java/com/airline/domain/DisputeStatus.java"
  - "backend/src/main/java/com/airline/repository/DisputeRepository.java"
  - "backend/src/main/java/com/airline/service/DisputeService.java"
  - "backend/src/main/java/com/airline/api/DisputeController.java"
  - "frontend/src/pages/DisputesList.tsx"
  - "frontend/src/pages/DisputeDetailModal.tsx"
  - "frontend/src/App.tsx"
  - "e2e/tests/dispute-management.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-10
  - INV-11
  - INV-12
---

## Scope

1. **Database Migration (`V26__dispute_management.sql`)**: Creates `disputes`, `dispute_line_items`, and `dispute_messages` tables with full relational mapping and indexes.
2. **Domain & Repositories**: Builds `Dispute`, `DisputeLineItem`, `DisputeMessage`, and `DisputeStatus` JPA entities and `DisputeRepository` with tenant-scoped dimensional filtering.
3. **Dispute Service & Controller**:
   - `initiateDispute`: Airline initiates line-item dispute on `SENT` invoices with category and comments (`INV-10`).
   - `respondToDispute`: Supplier responds with justification (`OPEN` → `RESPONDED` / `UNDER_REVIEW`).
   - `resolveDispute`: Airline accepts/rejects or escalates.
   - `generateCreditNote`: Auto-generates credit note in IATA IS-XML format on dispute acceptance without exceeding invoice total (`INV-11`).
4. **UI Workspaces & Analytics**:
   - `DisputesList.tsx`: Responsive Ant Design + Tailwind dispute queue workspace with status tabs (`All`, `Open`, `Responded`, `Resolved`), dimension filters, and summary metrics cards (SDR1 / ADR1).
   - `DisputeDetailModal.tsx`: Interactive modal for dispute thread messaging, line-item details, and credit note issuance.
5. **E2E & Unit Test Verification**: Full unit and Playwright integration coverage (`dispute-management.spec.ts`).
