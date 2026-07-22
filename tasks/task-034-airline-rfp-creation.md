---
id: TASK-034
title: "Phase 7.1: Airline RFP Creation"
owner: Shamith
paths:
  - "tasks/task-034-airline-rfp-creation.md"
  - "backend/src/main/java/com/airline/api/RfpController.java"
  - "backend/src/main/java/com/airline/api/dto/RfpCreateRequest.java"
  - "backend/src/main/java/com/airline/api/dto/RfpResponse.java"
  - "backend/src/main/java/com/airline/domain/Rfp.java"
  - "backend/src/main/java/com/airline/domain/RfpStatus.java"
  - "backend/src/main/java/com/airline/repository/RfpRepository.java"
  - "backend/src/main/java/com/airline/repository/SupplierConfigurationRepository.java"
  - "backend/src/main/java/com/airline/service/RfpService.java"
  - "backend/src/main/resources/db/migration/V19__rfp_creation.sql"
  - "backend/src/test/java/com/airline/rfp/RfpServiceTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineRfps.tsx"
  - "e2e/tests/airline-rfps.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 7.1. Airline users with `RFP_RAISER` can publish a validated,
tenant-owned RFP for one airport and service type. Publication targets only
ground handlers whose supplier configuration enables both the airline and
airport. The creation UI uses reference vocabularies and displays the airline's
published RFPs.
