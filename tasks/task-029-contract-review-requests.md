---
id: TASK-029
title: "Phase 6.4: Contract Review Requests"
owner: Shamith
paths:
  - "tasks/task-029-contract-review-requests.md"
  - "backend/src/main/resources/db/migration/V18__contract_review_requests.sql"
  - "backend/src/main/java/com/airline/domain/ContractReviewRequest.java"
  - "backend/src/main/java/com/airline/repository/ContractReviewRequestRepository.java"
  - "backend/src/main/java/com/airline/api/dto/ContractReviewRequestCreate.java"
  - "backend/src/main/java/com/airline/api/dto/ContractReviewRequestResponse.java"
  - "backend/src/main/java/com/airline/service/ContractReviewRequestService.java"
  - "backend/src/main/java/com/airline/api/ContractReviewRequestController.java"
  - "backend/src/test/java/com/airline/contracts/ContractReviewRequestServiceTest.java"
  - "backend/src/test/java/com/airline/api/ContractReviewRequestControllerTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineContracts.tsx"
  - "frontend/src/pages/ContractReviewRequests.tsx"
  - "e2e/tests/contract-review-requests.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-03
---

## Scope

Implements Phase 6.4 contract collaboration. Airline contract reviewers can
submit a mandatory comment against an approved, visible contract. Review
requests are stored as separate tenant-scoped records so the approved contract
remains immutable, and dimension-authorized ground-handler users can view the
requests in a dedicated queue.
