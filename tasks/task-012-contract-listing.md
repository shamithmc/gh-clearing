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
  - "backend/src/main/resources/db/migration/V1__init_schema.sql"
  - "backend/src/main/resources/db/migration/V2__seed_reference_data.sql"
  - "backend/src/main/resources/db/migration/V3__supplier_configuration.sql"
  - "backend/src/main/resources/db/migration/V4__contracts_and_services.sql"
  - "backend/src/main/resources/db/migration/V5__add_tax_code.sql"
proof: COMPILER
invariants:
  - INV-01
---

# TASK-012: Contract Listing & Filters

Exposes a GET API to retrieve contracts filtered by status and tenant context, and updates the frontend Contracts List view with expandable details and filter controls.
