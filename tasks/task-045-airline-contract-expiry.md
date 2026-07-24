---
id: TASK-045
title: "Phase 8.5: Airline Contracts Expiry"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-045-airline-contract-expiry.md"
  - "backend/src/main/resources/db/migration/V25__airport_coordinates.sql"
  - "backend/src/main/java/com/airline/domain/Airport.java"
  - "backend/src/main/java/com/airline/api/dto/AirportResponse.java"
  - "backend/src/main/java/com/airline/api/dto/AirlineContractExpiryResponse.java"
  - "backend/src/main/java/com/airline/api/AirlineContractExpiryController.java"
  - "backend/src/main/java/com/airline/service/AirlineContractExpiryService.java"
  - "backend/src/test/java/com/airline/reports/AirlineContractExpiryServiceTest.java"
  - "frontend/src/pages/AirlineContractExpiryPanel.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "e2e/tests/airline-contract-expiry.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 8.5 AOR1. Airline users with `MIS_VIEWER` can inspect approved
contracts approaching expiry over a bounded horizon, filter by supplier,
airport, and service, and use both urgency-sorted table and geographic airport
views. Airport coordinates extend the canonical reference records for this and
later footprint maps. Tenant and dimensional scope checks run before any
contract is included or mapped.
