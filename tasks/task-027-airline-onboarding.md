---
id: TASK-027
title: "Phase 6.1 & 6.2: Airline Onboarding & Dashboard"
owner: Shamith
paths:
  - "tasks/task-027-airline-onboarding.md"
  - "backend/src/main/java/com/airline/api/UserController.java"
  - "backend/src/main/java/com/airline/service/UserService.java"
  - "frontend/src/pages/AirlineDashboard.tsx"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
---

## Scope
Implements Airline Onboarding and Airline Dashboard Shell.
- **Phase 6.1 (Airline Tenant Setup):** Enforce airline-side tenant provisioning, user creation, and role assignment (all 7 airline roles). Specifically update access control in `UserController` and `UserService` to allow `AIRLINE_ADMIN` (or the platform admin) to manage users within their own tenant, and validate roles against the list of airline roles.
- **Phase 6.2 (Airline Dashboard Shell & Views):** Introduce an airline-specific landing page with navigation to their features (Contracts, Invoices, Disputes) and proper role/dimensional restrictions.
