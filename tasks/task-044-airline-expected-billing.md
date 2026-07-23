---
id: TASK-044
title: "Phase 8.4: Airline Expected Billing"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-044-airline-expected-billing.md"
  - "backend/src/main/resources/db/migration/V24__service_billing_frequency.sql"
  - "backend/src/main/java/com/airline/domain/BillingFrequency.java"
  - "backend/src/main/java/com/airline/domain/ServiceConfiguration.java"
  - "backend/src/main/java/com/airline/api/dto/ServiceConfigurationDTO.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/api/dto/AirlineExpectedBillingResponse.java"
  - "backend/src/main/java/com/airline/api/AirlineExpectedBillingController.java"
  - "backend/src/main/java/com/airline/service/AirlineExpectedBillingService.java"
  - "backend/src/test/java/com/airline/reports/AirlineExpectedBillingServiceTest.java"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/AirlineExpectedBillingPanel.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "e2e/tests/airline-expected-billing.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 8.4 AFR2. Contract services can optionally declare a closed
billing frequency and positive expected amount per occurrence. Airline users
with `MIS_VIEWER` can inspect approved-contract projections as currency-separated
totals and a day-versus-amount line chart, filter by supplier, airport, service,
and date, and drill into each projected occurrence. Tenant and dimensional
scope checks run before contract services are projected.
