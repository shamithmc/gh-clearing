---
id: TASK-FIX-MAIN-KEYCLOAK-CI
title: "Fix Keycloak Provisioning After Tenant Isolation Merge"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/java/com/airline/service/AuthenticatedUserProvisioningService.java"
  - "backend/src/test/java/com/airline/security/AuthenticatedUserProvisioningServiceTest.java"
  - "tasks/task-fix-main-keycloak-ci.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

1. Restore main compilation after structural tenant isolation removed unscoped
   repository reads.
2. Keep Keycloak user provisioning tenant-scoped by subject and tenant ID.
3. Verify the provisioning behavior and CI governance checks.
