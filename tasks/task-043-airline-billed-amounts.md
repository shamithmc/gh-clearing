---
id: TASK-043
title: "Phase 8.3: Airline Billed Amounts"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-043-airline-billed-amounts.md"
  - "backend/src/main/java/com/airline/api/AirlineFinancialController.java"
  - "backend/src/main/java/com/airline/api/dto/AirlineBilledAmountsResponse.java"
  - "backend/src/main/java/com/airline/service/AirlineFinancialService.java"
  - "backend/src/test/java/com/airline/invoices/AirlineBilledAmountsServiceTest.java"
  - "frontend/src/pages/AirlineBilledAmountsPanel.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "e2e/tests/airline-billed-amounts.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-08
  - INV-12
---

## Scope

Implements Phase 8.3 AFR1 for airline users with `MIS_VIEWER`. The report
summarizes dispatched billed, paid, and outstanding amounts by supplier,
airport, and service, while keeping currencies separate. Filters and chart
interactions drill down to the contributing invoices. Repository reads are
tenant-scoped, dimensional access is enforced before aggregation, and
non-airline tenants are denied.
