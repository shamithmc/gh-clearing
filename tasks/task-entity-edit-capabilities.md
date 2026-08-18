---
id: TASK-073
title: "Comprehensive Entity Edit Capabilities & Revision Workflows"
owner: Shamith
state: REVIEW
paths:
  - ".gitignore"
  - "backend/src/main/java/com/airline/api/ContractController.java"
  - "backend/src/main/java/com/airline/api/RfpController.java"
  - "backend/src/main/java/com/airline/api/ServiceMarketplaceController.java"
  - "backend/src/main/java/com/airline/api/SupplierRfpController.java"
  - "backend/src/main/java/com/airline/api/TenantController.java"
  - "backend/src/main/java/com/airline/api/dto/TenantRequest.java"
  - "backend/src/main/java/com/airline/repository/RfpProposalRepository.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/service/RfpService.java"
  - "backend/src/main/java/com/airline/service/ServiceMarketplaceService.java"
  - "backend/src/main/java/com/airline/service/SupplierRfpService.java"
  - "backend/src/main/java/com/airline/service/TenantService.java"
  - "backend/src/test/java/com/airline/api/ContractControllerTest.java"
  - "backend/src/test/java/com/airline/contracts/ContractLifecycleTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeAttachmentIntegrationTest.java"
  - "e2e/tests/contract-edit-cycles.spec.ts"
  - "e2e/tests/contract-wizard-formulas.spec.ts"
  - "e2e/tests/entity-edit-capabilities.spec.ts"
  - "e2e/tests/invoice-edit-cycles.spec.ts"
  - "frontend/src/App.tsx"
  - "frontend/src/pages/AirlineRfps.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/pages/ServiceOfferings.tsx"
  - "frontend/src/pages/SupplierRfps.tsx"
  - "frontend/src/pages/TenantManagement.tsx"
  - "frontend/src/pages/__tests__/ContractWizard.test.tsx"
  - "frontend/src/pages/__tests__/InvoiceEntryWizard.test.tsx"
  - "tasks/task-entity-edit-capabilities.md"
proof: E2E
invariants:
  - INV-01
  - INV-02
  - INV-03
  - INV-04
  - INV-05
  - INV-06
  - INV-07
  - INV-08
  - INV-09
  - INV-10
  - INV-11
  - INV-12
---

## Scope

1. **Contract and Invoice Editing**:
   - SGHA Contract edit capabilities supporting draft modifications and review-requested revision lifecycles (`DRAFT`, `REVIEW_REQUESTED`).
   - Turnaround invoice edit mode pre-filling header information, flight lines, quantity drivers, and SGHA SLA linkages for `DRAFT` and `MODIFICATION_REQUESTED` invoices.

2. **Extended Entity Editing**:
   - Service Marketplace Offerings: Edit service descriptions and airport capabilities.
   - Ground Handler RFP Proposals / Bids: Edit / revise proposed rates, currencies, and SLA commercial terms.
   - Airline RFPs: Edit service requirements, desired operating periods, and airports.
   - Tenant Organizations: Platform Admin editing of organization name and `ACTIVE`/`INACTIVE` status.

3. **Verification**:
   - End-to-end Playwright tests in `contract-edit-cycles.spec.ts`, `invoice-edit-cycles.spec.ts`, and `entity-edit-capabilities.spec.ts`.
   - Frontend Vitest unit tests in `ContractWizard.test.tsx`, `InvoiceEntryWizard.test.tsx`, `TenantManagement.test.tsx`, and `UserManagement.test.tsx`.
   - Backend JUnit and MockMvc integration tests across contract, invoice, RFP, and tenant controllers.
