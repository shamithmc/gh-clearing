---
id: TASK-012
title: "Phase 2: Contract Listing & Filters (2.4)"
owner: Shamith
paths:
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/api/ContractController.java"
  - "backend/src/test/java/com/airline/api/ContractControllerTest.java"
  - "frontend/src/pages/ContractsList.tsx"
proof: COMPILER
invariants:
  - INV-01
---

# TASK-012: Contract Listing & Filters

Exposes a GET API to retrieve contracts filtered by status and tenant context, and updates the frontend Contracts List view with expandable details and filter controls.
