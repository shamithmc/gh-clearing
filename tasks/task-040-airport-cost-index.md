---
id: TASK-040
title: "Phase 8.1: Confidentiality-Safe Airport Cost Index"
owner: Shamith
paths:
  - "tasks/task-040-airport-cost-index.md"
  - "backend/src/main/resources/db/migration/V23__invoice_aircraft_type.sql"
  - "backend/src/main/java/com/airline/domain/InvoiceLineItem.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/api/dto/AirportCostIndexResponse.java"
  - "backend/src/main/java/com/airline/api/AirportCostIndexController.java"
  - "backend/src/main/java/com/airline/service/AirportCostIndexService.java"
  - "backend/src/test/java/com/airline/marketintelligence/AirportCostIndexServiceTest.java"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "frontend/src/pages/AirportCostIndex.tsx"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "e2e/tests/airport-cost-index.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 8.1. Airline users with `MIS_VIEWER` can inspect anonymized
average billed costs by airport, region, service, aircraft type, operation
type, and currency. Only dispatched invoice observations are eligible, every
row is filtered through the user's dimensional access scope, and a segment is
suppressed unless at least two distinct suppliers contributed. Supplier
identities never leave the aggregation service.
