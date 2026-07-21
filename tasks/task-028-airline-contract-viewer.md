---
id: TASK-028
title: "Phase 6.3: Airline Contract Viewer"
owner: Shamith
paths:
  - "tasks/task-028-airline-contract-viewer.md"
  - "backend/src/main/java/com/airline/api/ContractController.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/test/java/com/airline/api/ContractControllerTest.java"
  - "backend/src/test/java/com/airline/contracts/AirlineContractViewerTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "frontend/src/pages/AirlineContracts.tsx"
  - "e2e/tests/airline-contracts.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
---

## Scope

Implements Phase 6.3 airline contract viewing. Airline users can read only
non-draft contracts belonging to their tenant, subject to their airport and
service-type dimensions. The UI is read-only and supports explicit airport
and service filters without exposing supplier contract actions.
