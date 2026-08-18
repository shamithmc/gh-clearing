---
id: TASK-072
title: "Fix Contract Wizard Step Validation and Dynamic Invoice Downloads"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/main/java/com/airline/xml/IsXmlGeneratorService.java"
  - "backend/src/test/java/com/airline/api/InvoiceControllerTest.java"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/__tests__/ContractWizard.test.tsx"
  - "tasks/task-wizard-validation-and-invoice-downloads.md"
proof: UNIT
invariants:
  - INV-01
  - INV-02
---

## Scope

1. **Contract Wizard Step Navigation Validation**:
   - Update Step 1 (*Header Details*) validation in `ContractWizard.tsx` to validate only header fields (`airlineId`, `airportCode`, `dateRange`, `currency`) rather than triggering whole-form validation on unvisited/hidden Step 2 fields.
   - Provide default rate structure fallbacks (`timeBands`, `tiers`) when loading contracts for editing so formulas (`PF-05`, `PF-03`, `PF-04`) initialize with valid rate collections.
   - Unit test coverage in `ContractWizard.test.tsx` for Step 1 -> Step 2 navigation when editing contracts with `PF-05` services.

2. **Dynamic XML and PDF Invoice Downloads**:
   - Update `InvoiceController.java` to dynamically generate application-contract XML (`IsXmlGeneratorService`) and PDF documents (`InvoicePdfService`) on-the-fly when `xmlFileKey` or `pdfFileKey` is null or files are missing from storage (e.g. staging seeded invoices, container restarts).
   - Harden `IsXmlGeneratorService.java` with null-safe defaults for missing tenant, dates, currency, and line items.
   - Add unit tests in `InvoiceControllerTest.java` verifying fallback on-demand generation.
