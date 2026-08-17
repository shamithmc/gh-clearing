---
id: TASK-071
title: "Build Dynamic Formula Authoring UI for PF-01 through PF-07 (Phase 10.0 Carryover)"
owner: Shamith
state: REVIEW
paths:
  - "e2e/playwright.config.ts"
  - "e2e/tests/contract-wizard-formulas.spec.ts"
  - "frontend/src/components/pricing/CompoundDriverEditor.tsx"
  - "frontend/src/components/pricing/DayRatesEditor.tsx"
  - "frontend/src/components/pricing/FormulaReviewCard.tsx"
  - "frontend/src/components/pricing/MtowEditor.tsx"
  - "frontend/src/components/pricing/TiersEditor.tsx"
  - "frontend/src/components/pricing/TimeBandsEditor.tsx"
  - "frontend/src/components/pricing/types.ts"
  - "frontend/src/components/pricing/__tests__/FormulaEditors.test.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/__tests__/ContractWizard.test.tsx"
  - "tasks/task-071-contract-formula-authoring.md"
proof: E2E
invariants:
  - INV-02
  - INV-05
---

## Scope

1. **Dynamic Formula Authoring Sub-Editors**:
   - Structured sub-editors dynamically rendered for all 7 formula pricing models:
     - **PF-01 (Unit Rate)**: Flat unit rate input with single quantity driver and UoM.
     - **PF-02 (Compound Unit Rate)**: Multi-driver configuration requiring at least two drivers (`passengers,bags`, etc.) and base rate.
     - **PF-03 (Incremental Tiered Volume)**: Dynamic table of incremental tiers with strict monotonicity validation (`upto[i] > upto[i-1]`), terminal tier toggle (`upto: null`), and non-negative rates.
     - **PF-04 (All-Units Slab Rate)**: Dynamic table of slabs applying triggered threshold rates to all units.
     - **PF-05 (Time Band Rate)**: Dynamic time range bands (`start` and `end` in HH:mm), supporting overnight spans (e.g. 22:00 to 06:00) and preset helpers.
     - **PF-06 (Day-of-Week Rate)**: 7-day rate inputs (MONDAY through SUNDAY) with quick-fill presets ("Same rate all days", "Weekday / Weekend split").
     - **PF-07 (MTOW Aircraft Weight Rate)**: Rate per metric tonne MTOW with invariant advisory notice (`INV-05`).

2. **Reference Data Integration**:
   - Dynamic fetching from backend reference endpoints:
     - `/api/reference/airlines` for Airline Carrier options.
     - `/api/reference/airports` for Airport Hub / Station options.
     - `/api/reference/charge-codes` for the 25 standard IATA charge codes.
   - Resilient fallbacks ensuring smooth offline and test operation.

3. **Structured Review & Summary**:
   - Header summary banner detailing Carrier, Airport, Validity Period, Currency, and total service line count.
   - Dedicated `FormulaReviewCard` for each service line rendering visual breakdowns (tier tables, time band schedules, day grids, compound tags, MTOW notes).
   - Form submission transforming rates into backend-compliant `rateDetails` JSON.

4. **Testing & Verification**:
   - Component and page unit tests in `ContractWizard.test.tsx` and `FormulaEditors.test.tsx`.
   - Playwright end-to-end test suite in `contract-wizard-formulas.spec.ts`.

## Invariant Trace

- **INV-02 (Dimensional Scope Enforcement)**: Contract wizard enforces valid IATA Charge Codes (backed by 25 canonical codes), Airport stations, and Airline carrier scopes.
- **INV-05 (PF-07 Tail ID Requirement)**: MTOW editor configures rate per metric tonne and enforces explicit UI advisory regarding backend Tail ID registry lookup and Aircraft Type fallback.
