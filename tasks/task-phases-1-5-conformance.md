---
id: AUDIT-PHASES-1-5-CONFORMANCE
title: "Audit fixes: Phases 1-5 architecture conformance"
owner: Shamith
paths:
  - "tasks/task-phases-1-5-conformance.md"
  - "backend/src/main/java/com/airline/config/DevUserInitializer.java"
  - "backend/src/main/java/com/airline/domain/AircraftTypeMtowDefault.java"
  - "backend/src/main/java/com/airline/pricing/PricingValidation.java"
  - "backend/src/main/java/com/airline/repository/AircraftTypeMtowDefaultRepository.java"
  - "backend/src/main/resources/db/migration/V15__restore_tenant_discriminators.sql"
  - "backend/src/main/resources/db/migration/V16__aircraft_type_mtow_defaults.sql"
  - "backend/src/main/resources/db/migration/V17__invoice_currency_metadata_and_uniqueness.sql"
  - "backend/src/test/java/com/airline/security/DevAuthFilterTest.java"
  - "backend/src/test/java/com/airline/security/TenantContextTest.java"
  - "frontend/src/utils/simulatedAuth.ts"
proof: CONFORMANCE
invariants:
  - INV-01
  - INV-02
  - INV-03
  - INV-04
  - INV-05
  - INV-06
  - INV-07
  - INV-08
  - INV-09
---

## Scope

Cross-cutting conformance fixes for the Phase 1 through Phase 5 architecture audit.
The implementation hardens tenant and dimensional isolation, contract transitions,
pricing and MTOW validation, and the invoice currency, uniqueness, immutability,
and IS-XML guards.

## Verification

- Backend clean suite: 95 tests passed.
- Affected Playwright UI suite: 6 tests passed.
- Frontend build and TypeScript checks passed.
- Git whitespace validation passed.
