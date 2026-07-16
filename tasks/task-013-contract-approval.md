---
id: TASK-013
title: "Phase 2: Contract Approval Workflow (2.5)"
owner: Shamith
paths:
  - "backend/src/main/java/com/airline/security/DevAuthFilter.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/api/ContractController.java"
  - "backend/src/test/java/com/airline/contracts/ContractLifecycleTest.java"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
proof: UNIT
invariants:
  - INV-03
---

# TASK-013: Contract Approval Workflow

Implements the role-based contract status transitions (Draft -> Pending -> Approved) and enforces INV-03.
Also adds a DevAuthFilter to bypass Keycloak requirements during local development.
