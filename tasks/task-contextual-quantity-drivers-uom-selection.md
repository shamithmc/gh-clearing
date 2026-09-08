---
id: TASK-074
title: "Contextual Quantity Driver and Unit of Measurement (UoM) Selection in Contract Wizard"
owner: Shamith
state: REVIEW
paths:
  - "e2e/playwright.config.ts"
  - "e2e/tests/contract-wizard-formulas.spec.ts"
  - "e2e/tests/contracts.spec.ts"
  - "frontend/src/components/pricing/CompoundDriverEditor.tsx"
  - "frontend/src/components/pricing/taxonomy.ts"
  - "frontend/src/components/pricing/types.ts"
  - "frontend/src/components/pricing/__tests__/Taxonomy.test.ts"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/__tests__/ContractWizard.test.tsx"
  - "tasks/task-contextual-quantity-drivers-uom-selection.md"
proof: E2E
invariants:
  - INV-01
  - INV-02
---

## Scope

1. **Taxonomy & Mapping Reference Definition**:
   - Created `frontend/src/components/pricing/taxonomy.ts` containing the standard SGHA charge code reference mappings for default `quantityDriver` and `uom` (e.g. `PASSENGER_HANDLING` -> `passengers`/`PAX`, `BAGGAGE` -> `bags`/`BAG`, `CARGO_HANDLING` -> `cargo_kg`/`KG`, `RAMP_HANDLING` -> `aircraft_movements`/`FLT`, `DEICING` -> `litres`/`LTR`, `RENT_EQUIPMENT` -> `hours`/`HRS`).
   - Exported standard option lists `STANDARD_QUANTITY_DRIVERS` and `STANDARD_UOMS`.
   - Re-exported all types and helpers in `frontend/src/components/pricing/types.ts`.

2. **Contextual Auto-Population in Contract Wizard**:
   - Updated `ContractWizard.tsx` with `handleChargeCodeChange` to automatically populate `serviceName`, `quantityDriver`, and `uom` upon selecting a charge code.
   - Updated `handleFormulaChange` to preset `quantityDriver = 'mtow_tonnes'` and `uom = 'TONNE'` for `PF-07` and synchronize compound drivers for `PF-02`.

3. **Searchable Tag Selects**:
   - Replaced free-text `<Input>` fields with `<Select mode="tags" maxCount={1} showSearch allowClear>` dropdowns with standard suggestions while allowing custom text metric inputs.
   - Preserved element IDs (`services_${name}_quantityDriver`, `services_${name}_uom`).

4. **Testing & Verification**:
   - Added unit test suite `Taxonomy.test.ts` and updated `ContractWizard.test.tsx`.
   - Updated Playwright E2E suites (`contract-wizard-formulas.spec.ts` & `contracts.spec.ts`) with robust dropdown selection targeting.
