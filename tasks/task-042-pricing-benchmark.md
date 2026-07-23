---
id: TASK-042
title: "Phase 8.2: Confidentiality-Safe Airline Pricing Benchmark"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-042-pricing-benchmark.md"
  - "backend/src/main/java/com/airline/api/PricingBenchmarkController.java"
  - "backend/src/main/java/com/airline/api/dto/PricingBenchmarkResponse.java"
  - "backend/src/main/java/com/airline/service/PricingBenchmarkService.java"
  - "backend/src/test/java/com/airline/pricing/PricingBenchmarkServiceTest.java"
  - "frontend/src/pages/AirportCostIndex.tsx"
  - "frontend/src/pages/PricingBenchmarkPanel.tsx"
  - "e2e/tests/airport-cost-index.spec.ts"
  - "e2e/tests/pricing-benchmark.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-04
  - INV-12
---

## Scope

Implements Phase 8.2. Airline users with `MIS_VIEWER` can see whether their own
average dispatched cost is in the premium top quartile, middle half, or
discount bottom quartile for an airport, service, aircraft type, operation
type, and currency segment. A benchmark is suppressed until two distinct
suppliers contribute, and neither competitor costs nor supplier identities
leave the service. All results honor the user's airline, airport, and
charge-code access scope.
