---
id: TASK-011
title: "Phase 2: Contract Entry API & UI (2.3)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V5__add_tax_code.sql"
  - "backend/src/main/java/com/airline/domain/ServiceConfiguration.java"
  - "backend/src/main/java/com/airline/api/dto/ContractCreateRequest.java"
  - "backend/src/main/java/com/airline/api/dto/ServiceConfigurationDTO.java"
  - "backend/src/main/java/com/airline/api/dto/ContractResponse.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/security/TenantContext.java"
  - "backend/src/main/java/com/airline/api/ContractController.java"
  - "backend/src/test/java/com/airline/api/ContractControllerTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/package.json"
  - "frontend/package-lock.json"
  - "dependency-allowlist.json"
proof: COMPILER
invariants:
  - INV-01
---

# TASK-011: Contract Entry API & UI Wizard

Implements the backend API for creating contracts in DRAFT state and the frontend multi-step wizard to guide users through selecting the dynamic pricing formulas.
