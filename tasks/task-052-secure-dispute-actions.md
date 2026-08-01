---
id: TASK-052
title: "Secure Dispute Actions and State Transitions"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-052-secure-dispute-actions.md"
  - "obligations.json"
  - "backend/src/main/java/com/airline/api/DisputeController.java"
  - "backend/src/main/java/com/airline/api/GlobalExceptionHandler.java"
  - "backend/src/main/java/com/airline/domain/DisputeAction.java"
  - "backend/src/main/java/com/airline/domain/DisputeStatus.java"
  - "backend/src/main/java/com/airline/service/DisputeService.java"
  - "backend/src/test/java/com/airline/api/DisputeControllerSecurityTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeServiceSecurityTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/vocabularies/VocabularyEnforcementTest.java"
  - "frontend/src/pages/DisputeDetailModal.tsx"
  - "frontend/src/pages/DisputesList.tsx"
  - "frontend/src/pages/__tests__/DisputeDetailModal.test.tsx"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-10
  - INV-11
  - INV-12
---

## Scope

1. Require the contract-defined airline and ground-handler roles for every dispute operation.
2. Enforce tenant-party and dimensional authorization for dispute reads and writes.
3. Replace free-form actions with a closed action vocabulary and a party-aware state-transition table.
4. Reject blank initiation comments, unknown actions, invalid transitions, and repeated terminal actions.
5. Add service, controller, dimensional-access, and vocabulary tests for the secured workflow.
