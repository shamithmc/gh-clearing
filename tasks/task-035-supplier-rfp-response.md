---
id: TASK-035
title: "Phase 7.2: Supplier RFP Listing and Response"
owner: Shamith
paths:
  - "tasks/task-035-supplier-rfp-response.md"
  - "backend/src/main/java/com/airline/api/SupplierRfpController.java"
  - "backend/src/main/java/com/airline/api/dto/RfpProposalCreateRequest.java"
  - "backend/src/main/java/com/airline/api/dto/SupplierRfpResponse.java"
  - "backend/src/main/java/com/airline/domain/RfpProposal.java"
  - "backend/src/main/java/com/airline/domain/RfpProposalStatus.java"
  - "backend/src/main/java/com/airline/repository/RfpProposalRepository.java"
  - "backend/src/main/java/com/airline/repository/RfpRepository.java"
  - "backend/src/main/java/com/airline/security/DevAuthFilter.java"
  - "backend/src/main/java/com/airline/service/SupplierConfigurationService.java"
  - "backend/src/main/java/com/airline/service/SupplierRfpService.java"
  - "backend/src/main/resources/db/migration/V20__rfp_proposals.sql"
  - "backend/src/test/java/com/airline/rfp/SupplierRfpServiceTest.java"
  - "backend/src/test/java/com/airline/security/DevAuthFilterTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/SupplierRfps.tsx"
  - "e2e/tests/supplier-rfps.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
---

## Scope

Implements Phase 7.2. Ground-handler users with `RFP_MONITOR` see only
published RFPs explicitly targeted to their tenant and permitted by their
airport, airline, and service scope. They can submit one tenant-owned proposal
per RFP with a positive rate, currency, and commercial terms.
