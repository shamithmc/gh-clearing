---
id: TASK-072
title: "Seed PLATFORM Tenant for Platform Administration"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/db/migration/V32__seed_platform_tenant.sql"
  - "tasks/task-seed-platform-tenant.md"
proof: UNIT
invariants:
  - INV-01
  - INV-02
---

## Scope

1. **Database Migration for Platform Tenant**:
   - Seed default `PLATFORM` tenant (`type = 'PLATFORM_ADMIN'`, `status = 'ACTIVE'`) via `V32__seed_platform_tenant.sql`.
   - Supports platform administration login and tenant provisioning via WorkOS AuthKit.

2. **Verification**:
   - Backend unit tests (`TenantControllerTest`, `UserControllerTest`, `UserServiceTest`) verify tenant and user provisioning logic.
