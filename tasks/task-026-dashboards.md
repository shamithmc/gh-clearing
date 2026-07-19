---
id: TASK-026
title: "Phase 5: Supplier MIS & Dashboards"
owner: Shamith
paths:
  - "tasks/task-026-dashboards.md"
  - "backend/src/main/java/com/airline/api/dto/DashboardDtos.java"
  - "backend/src/main/java/com/airline/service/DashboardService.java"
  - "backend/src/main/java/com/airline/api/DashboardController.java"
  - "frontend/src/pages/Dashboard.tsx"
  - "backend/src/test/java/com/airline/service/DashboardServiceTest.java"
  - "e2e/tests/dashboard.spec.ts"
proof: INTEGRATION
invariants:
  - INV-02
---

## Scope
Implements supplier-facing analytics dashboard and widgets including receivables summary, monthly invoiced amount trends, revenue per flight, and expiring contracts. Enforces role-based report access.
