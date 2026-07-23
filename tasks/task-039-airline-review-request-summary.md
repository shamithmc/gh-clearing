---
id: TASK-039
title: "Phase 7.6: AOR3 Airline Review Request Summary"
owner: Shamith
paths:
  - "tasks/task-039-airline-review-request-summary.md"
  - "backend/src/main/java/com/airline/api/ContractReviewRequestController.java"
  - "backend/src/main/java/com/airline/api/dto/ContractReviewRequestResponse.java"
  - "backend/src/main/java/com/airline/repository/ContractReviewRequestRepository.java"
  - "backend/src/main/java/com/airline/service/ContractReviewRequestService.java"
  - "backend/src/test/java/com/airline/contracts/ContractReviewRequestServiceTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineReviewRequests.tsx"
  - "e2e/tests/airline-review-request-summary.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 7.6 AOR3. Airline users with `CONTRACT_REVIEWER` can view only
their tenant-owned, dimension-authorized history of sent contract review
requests. The summary includes supplier, airport, closed-vocabulary service
types, current contract status, requester, comment, and timestamp, with metrics
and supplier/airport/service/status filters.
