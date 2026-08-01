---
id: TASK-FRONTEND-KEYCLOAK-AUTH
title: "Connect Staging Frontend to Keycloak"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/java/com/airline/api/AuthController.java"
  - "backend/src/main/java/com/airline/api/dto/AuthenticatedUserResponse.java"
  - "backend/src/main/java/com/airline/api/dto/BrowserAuthConfigResponse.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/service/AuthenticatedUserProvisioningService.java"
  - "backend/src/main/resources/application-staging.yml"
  - "backend/src/main/resources/deploy/render.yaml"
  - "backend/src/test/java/com/airline/security/SecurityConfigTest.java"
  - "backend/src/test/java/com/airline/security/AuthenticatedUserProvisioningServiceTest.java"
  - "docs/keycloak-staging.md"
  - "dependency-allowlist.json"
  - "frontend/package.json"
  - "frontend/package-lock.json"
  - "frontend/src/auth/keycloakAuth.test.ts"
  - "frontend/src/auth/keycloakAuth.ts"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/main.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/Dashboard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/utils/simulatedAuth.ts"
  - "keycloak/Dockerfile"
  - "keycloak/realm-gh-clearing.json"
  - "keycloak/render-entrypoint.sh"
  - "tasks/task-render-staging-config.md"
  - "tasks/task-frontend-keycloak-auth.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

1. Authenticate the staging SPA through Keycloak's authorization-code flow with PKCE.
2. Refresh and attach bearer tokens to same-origin API requests.
3. Provision trusted Keycloak subjects into the tenant-scoped application user model.
4. Preserve simulated authentication for local dev and e2e profiles.
5. Provision an optimized Keycloak service, realm, client, roles, and isolated
   schema from the existing staging Render Blueprint.
