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
  - "backend/src/main/resources/deploy/keycloak/Dockerfile"
  - "backend/src/main/resources/deploy/keycloak/realm-gh-clearing.json"
  - "backend/src/main/resources/deploy/keycloak/render-entrypoint.sh"
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

## Staging configuration

The Blueprint imports the `gh-clearing` realm and creates the public
`gh-clearing-web` OpenID Connect client. It enables the authorization-code flow
with PKCE `S256`, disables direct access grants, and permits redirects and web
origins from `https://gh-clearing-staging.onrender.com`.

Each application user must have controlled `tenant_id` and `tenant_type`
attributes. Supported tenant types are `AIRLINE`, `GROUND_HANDLER`, and
`PLATFORM_ADMIN`. Assign the appropriate application realm or client roles;
the backend provisions the trusted Keycloak subject into the application user
table on first access.

The application uses the public issuer and JWK endpoints under
`https://gh-clearing-keycloak.onrender.com/realms/gh-clearing`. The Keycloak
service shares the staging PostgreSQL database through an isolated `keycloak`
schema. During Blueprint deployment, Render must be given the secret
`KC_BOOTSTRAP_ADMIN_PASSWORD`; the bootstrap username defaults to `admin`.
