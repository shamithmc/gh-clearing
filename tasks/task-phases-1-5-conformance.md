---
id: AUDIT-PHASES-1-5-CONFORMANCE
title: "Audit fixes: Phases 1-5 architecture conformance"
owner: Shamith
paths:
  - "tasks/task-phases-1-5-conformance.md"
  - "backend/src/main/java/com/airline/config/DevUserInitializer.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/domain/AircraftTypeMtowDefault.java"
  - "backend/src/main/java/com/airline/domain/Contract.java"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/domain/User.java"
  - "backend/src/main/java/com/airline/pricing/PricingEngine.java"
  - "backend/src/main/java/com/airline/pricing/PricingValidation.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/DayBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/MtowBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/SlabBasedAllUnitsEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/SlabBasedIncrementalEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/TimeBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/UnitRateCompoundEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/UnitRateEvaluator.java"
  - "backend/src/main/java/com/airline/repository/AircraftTypeMtowDefaultRepository.java"
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/security/DevAuthFilter.java"
  - "backend/src/main/java/com/airline/security/DimensionalSecurityEvaluator.java"
  - "backend/src/main/java/com/airline/security/TenantContext.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/service/DashboardService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/resources/db/migration/V15__restore_tenant_discriminators.sql"
  - "backend/src/main/resources/db/migration/V16__aircraft_type_mtow_defaults.sql"
  - "backend/src/main/resources/db/migration/V17__invoice_currency_metadata_and_uniqueness.sql"
  - "backend/src/test/java/com/airline/contracts/ContractLifecycleTest.java"
  - "backend/src/test/java/com/airline/disputes/CreditNoteValueLimitTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeValidationTest.java"
  - "backend/src/test/java/com/airline/invoices/CrossCurrencyValidationTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceImmutabilityTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceUniquenessTest.java"
  - "backend/src/test/java/com/airline/pricing/MtowLookupTest.java"
  - "backend/src/test/java/com/airline/pricing/PricingEngineTest.java"
  - "backend/src/test/java/com/airline/security/DevAuthFilterTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/security/TenantContextTest.java"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/service/DashboardServiceTest.java"
  - "backend/src/test/java/com/airline/xml/IataXmlComplianceTest.java"
  - "e2e/playwright.config.ts"
  - "e2e/tests/contracts.spec.ts"
  - "e2e/tests/dashboard.spec.ts"
  - "e2e/tests/invoice-approval.spec.ts"
  - "e2e/tests/invoices.spec.ts"
  - "frontend/index.html"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/Dashboard.tsx"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/utils/simulatedAuth.ts"
  - "start-dev.ps1"
  - "start-dev.sh"
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
