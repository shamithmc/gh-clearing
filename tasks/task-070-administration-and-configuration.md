---
id: TASK-070
title: "Complete Administration & Configuration Workflows (Phase 10.0 Carryover)"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/java/com/airline/api/TenantController.java"
  - "backend/src/main/java/com/airline/api/UserController.java"
  - "backend/src/main/java/com/airline/api/dto/UserUpdateRequest.java"
  - "backend/src/main/java/com/airline/repository/TenantRepository.java"
  - "backend/src/main/java/com/airline/service/TenantService.java"
  - "backend/src/main/java/com/airline/service/UserService.java"
  - "backend/src/test/java/com/airline/api/TenantControllerTest.java"
  - "backend/src/test/java/com/airline/api/UserControllerTest.java"
  - "backend/src/test/java/com/airline/service/TenantServiceTest.java"
  - "backend/src/test/java/com/airline/service/UserServiceTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/TenantManagement.tsx"
  - "frontend/src/pages/UserManagement.tsx"
  - "frontend/src/pages/__tests__/TenantManagement.test.tsx"
  - "frontend/src/pages/__tests__/UserManagement.test.tsx"
  - "frontend/src/utils/adminAccess.ts"
  - "e2e/tests/administration.spec.ts"
  - "tasks/task-070-administration-and-configuration.md"
proof: E2E
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

1. **Platform Admin Tenant Management**:
   - Platform admin global tenant listing, filtering by type/status, and searching.
   - Provisioning new Ground Handler and Airline tenant organizations with duplicate code and duplicate name prevention.
   - Secured behind `@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` on backend and 403 access control on `/admin/tenants`.

2. **User & Role Administration**:
   - Provisioning and updating users across roles for Platform, Ground Handler, and Airline tenant organizations.
   - Strict validation of closed role vocabularies conforming to the tenant organization type.
   - Enforcing own-tenant restrictions for tenant administrators (`GROUND_HANDLER_ADMIN`, `AIRLINE_ADMIN`, `ADMIN`) while allowing `PLATFORM_ADMIN` global tenant scoping.
   - Full update support (`PUT /api/tenants/{tenantId}/users/{userId}`) with email conflict prevention.

3. **Dimensional-Scope Administration (ABAC)**:
   - Configuring multi-dimensional access control restrictions for users:
     - `airportRestrictions` (IATA airport codes backed by `/api/reference/airports`).
     - `airlineRestrictions` (IATA airline codes backed by `/api/reference/airlines`, automatically omitted/enforced for Airline tenants).
     - `chargeCodeRestrictions` (IATA 25-standard charge codes backed by `/api/reference/charge-codes`).

4. **Multi-Tenant Security & Navigation Integration**:
   - Dynamic navigation menus for `PLATFORM_ADMIN` ("Platform Clearing" with Tenants & User Management), `GROUND_HANDLER_ADMIN` (Operations, Configuration, User Management), and `AIRLINE_ADMIN` (Operations, User Management).
   - Route guarding with 403 Access Denied views for unauthorized access attempts.

5. **Verification & Proofs**:
   - Unit and integration tests for `TenantControllerTest`, `TenantServiceTest`, `UserControllerTest`, and `UserServiceTest`.
   - Frontend component tests for `TenantManagement.test.tsx` and `UserManagement.test.tsx`.
   - Playwright E2E test suite `e2e/tests/administration.spec.ts`.

## Exclusions

- Database schema migrations (existing tables `tenants`, `users`, `user_airport_restrictions`, `user_airline_restrictions`, and `user_charge_code_restrictions` fully support all attributes).
- Modifications to core pricing or billing engine logic.
