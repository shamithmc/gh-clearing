---
id: TASK-047
title: "Phase 8.7: Supplier Operational Footprint"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-047-supplier-operational-footprint.md"
  - "backend/src/main/java/com/airline/api/dto/SupplierOperationalFootprintResponse.java"
  - "backend/src/main/java/com/airline/api/SupplierOperationalFootprintController.java"
  - "backend/src/main/java/com/airline/service/SupplierOperationalFootprintService.java"
  - "backend/src/test/java/com/airline/reports/SupplierOperationalFootprintServiceTest.java"
  - "frontend/src/pages/SupplierOperationalFootprintPanel.tsx"
  - "frontend/src/pages/Dashboard.tsx"
  - "e2e/tests/supplier-operational-footprint.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 8.7 SOR2. Supplier users with `MIS_VIEWER` can map their
active approved-contract footprint by airline, airport, and service. Explicit
recurring contract values are normalized to monthly amounts and kept separate
by currency. Hover/focus summaries and contract drill-downs expose operational
details. Tenant and dimensional checks run before contracts are aggregated.
