---
id: TASK-055
title: "Replace Keycloak with WorkOS AuthKit"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-055-workos-authkit.md"
  - "docs/PHASES.md"
  - "docs/workos-authkit-setup.md"
  - "obligations.json"
  - "dependency-allowlist.json"
  - "backend/pom.xml"
  - "backend/src/main/java/com/airline/api/AuthController.java"
  - "backend/src/main/java/com/airline/api/dto/BrowserAuthConfigResponse.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/security/WorkOsClientIdValidator.java"
  - "backend/src/main/java/com/airline/service/AuthenticatedUserProvisioningService.java"
  - "backend/src/main/resources/application.yml"
  - "backend/src/main/resources/application-staging.yml"
  - "backend/src/main/resources/deploy/render.yaml"
  - "backend/src/main/resources/deploy/keycloak/Dockerfile"
  - "backend/src/main/resources/deploy/keycloak/realm-gh-clearing.json"
  - "backend/src/main/resources/deploy/keycloak/render-entrypoint.sh"
  - "backend/src/test/java/com/airline/security/AuthenticatedUserProvisioningServiceTest.java"
  - "backend/src/test/java/com/airline/security/SecurityConfigTest.java"
  - "backend/src/test/java/com/airline/security/WorkOsClientIdValidatorTest.java"
  - "backend/src/test/java/com/airline/api/AuthControllerTest.java"
  - "frontend/package.json"
  - "frontend/package-lock.json"
  - "frontend/src/auth/keycloakAuth.test.ts"
  - "frontend/src/auth/keycloakAuth.ts"
  - "frontend/src/auth/workosAuth.test.ts"
  - "frontend/src/auth/workosAuth.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/main.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/Dashboard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/utils/simulatedAuth.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

1. Replace the self-hosted Render Keycloak service with managed WorkOS AuthKit.
2. Validate WorkOS issuer, signature, expiry, and application `client_id` before accepting JWTs.
3. Preserve signed tenant claims, the closed role vocabulary, local user provisioning, and dimensional restrictions.
4. Replace the Keycloak PKCE browser client with AuthKit hosted login, refresh, logout, and bearer-token transport.
5. Preserve simulated authentication exclusively for local development and E2E profiles.
