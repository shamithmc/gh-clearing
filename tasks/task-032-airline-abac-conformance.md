---
id: TASK-032
title: "Phase 6.7: ABAC for Airline Roles"
owner: Shamith
paths:
  - "tasks/task-032-airline-abac-conformance.md"
  - "backend/src/main/java/com/airline/service/DashboardService.java"
  - "backend/src/test/java/com/airline/service/DashboardServiceTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
---

## Scope

Completes Phase 6.7 by requiring the airline `MIS_VIEWER` role before dashboard
data is loaded and preserving fail-closed airport, airline, and charge-code
filtering for every airline analytics result.
