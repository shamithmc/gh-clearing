---
id: TASK-069
title: "Build secured ground-handler supplier configuration workflow"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/java/com/airline/api/SupplierConfigurationController.java"
  - "backend/src/main/java/com/airline/api/dto/SupplierConfigurationRequest.java"
  - "backend/src/main/java/com/airline/repository/SupplierConfigurationRepository.java"
  - "backend/src/main/java/com/airline/service/SupplierConfigurationService.java"
  - "backend/src/test/java/com/airline/api/SupplierConfigurationControllerTest.java"
  - "backend/src/test/java/com/airline/security/SupplierConfigurationSecurityTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/SupplierConfiguration.tsx"
  - "frontend/src/pages/__tests__/SupplierConfiguration.test.tsx"
  - "frontend/src/utils/supplierConfigurationAccess.ts"
  - "e2e/tests/supplier-configuration.spec.ts"
  - "tasks/task-068-audit-reconciliation.md"
  - "tasks/task-069-supplier-configuration.md"
proof: E2E
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

1. Replace the `/configuration` placeholder with a ground-handler supplier configuration form backed by the existing API.
2. Restrict navigation and route content to authorized ground-handler administrators.
3. Enforce own-tenant access for ground-handler administrators while retaining the existing explicit platform-admin API capability.
4. Cover loading, empty, validation, successful save, and API-error states.
5. Prove the workflow through focused backend, frontend component, and Playwright tests.

## Exclusions

- Platform tenant administration.
- Tenant-local user, role, or dimensional-scope administration.
- Airline administration.
- Database schema changes.
