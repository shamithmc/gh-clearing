---
id: TASK-062
title: "Make XML conformance claims truthful"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-061-database-integrity.md"
  - "tasks/task-062-truthful-xml-conformance.md"
  - ".github/scripts/validate_schema_provenance.py"
  - ".github/scripts/tests/test_governance_validators.py"
  - ".github/test-suites.json"
  - ".github/workflows/ci.yml"
  - "gates/level-1-core-gate.json"
  - "gates/level-3-start-gate.json"
  - "obligations.json"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/main/java/com/airline/service/DocumentGenerationJob.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
  - "backend/src/main/java/com/airline/xml/IsXmlGeneratorService.java"
  - "backend/src/main/java/com/airline/xml/IsXmlInvoice.java"
  - "backend/src/main/java/com/airline/xml/XmlGenerationException.java"
  - "backend/pom.xml"
  - "backend/src/main/resources/schema/README.md"
  - "backend/src/main/resources/schema/is-invoice.provenance.json"
  - "backend/src/main/resources/templates/invoice-pdf.html"
  - "backend/src/test/java/com/airline/xml/IataXmlComplianceTest.java"
  - "backend/src/test/java/com/airline/xml/InvoiceXmlContractValidationTest.java"
  - "backend/src/test/java/com/airline/xml/InvoiceXmlGenerationTest.java"
  - "e2e/tests/invoice-approval.spec.ts"
  - "frontend/src/pages/AirlineInvoices.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/DisputesList.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
proof: UNIT
invariants:
  - INV-01
  - INV-09
  - INV-12
---

## Scope

1. Classify the bundled invoice XSD as an application-owned interchange contract.
2. Reject false official provenance while retaining digest verification.
3. Remove unsupported official/compliant claims from code, tests, CI, PDFs, email, and UI.
4. Preserve fail-closed validation against the local contract before dispatch.
5. Record official IATA invoice and credit-note conformance as externally blocked pending a licensed, verifiable artifact.
6. Close merged task 061.

## Authority acceptance

The user approved changes to the conformance and CI controls before implementation.

## External blocker

Official IATA IS-XML conformance cannot be claimed or proven until an independently
verified licensed schema, envelope specification, and usage authority are supplied.
