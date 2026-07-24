---
id: TASK-046
title: "Phase 8.6: Airline Current Footprint"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-046-airline-current-footprint.md"
  - "backend/src/main/java/com/airline/api/dto/AirlineCurrentFootprintResponse.java"
  - "backend/src/main/java/com/airline/api/AirlineCurrentFootprintController.java"
  - "backend/src/main/java/com/airline/service/AirlineCurrentFootprintService.java"
  - "backend/src/test/java/com/airline/reports/AirlineCurrentFootprintServiceTest.java"
  - "frontend/src/pages/AirlineCurrentFootprintPanel.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "e2e/tests/airline-current-footprint.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 8.6 AOR2. Airline users with `MIS_VIEWER` can map their active
approved-contract footprint by airport, supplier, and service. Explicit
recurring contract values are normalized to monthly amounts, while dispatched
invoice values come from a bounded history window and remain separated by
currency. Hover/focus details and contract/invoice tabs provide drill-downs.
Tenant and dimensional checks run before contracts or invoices are aggregated.
