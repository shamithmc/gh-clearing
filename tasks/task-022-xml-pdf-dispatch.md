---
id: TASK-022
title: "Phase 4.2–4.4: IATA IS-XML Generation, PDF Rendering & Invoice Dispatch"
owner: Shamith
paths:
  - "tasks/task-022-xml-pdf-dispatch.md"
  - "backend/pom.xml"
  - "dependency-allowlist.json"
  - "docker-compose.yml"
  - "backend/src/main/resources/db/migration/V12__add_invoice_documents.sql"
  - "backend/src/main/resources/schema/is-invoice.xsd"
  - "backend/src/main/resources/templates/invoice-pdf.html"
  - "backend/src/main/resources/application.yml"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/xml/IsXmlInvoice.java"
  - "backend/src/main/java/com/airline/xml/LocalDateAdapter.java"
  - "backend/src/main/java/com/airline/xml/XmlGenerationException.java"
  - "backend/src/main/java/com/airline/xml/IsXmlGeneratorService.java"
  - "backend/src/main/java/com/airline/pdf/InvoicePdfService.java"
  - "backend/src/main/java/com/airline/pdf/PdfGenerationException.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/test/java/com/airline/xml/InvoiceXmlGenerationTest.java"
  - "backend/src/test/java/com/airline/pdf/InvoicePdfGenerationTest.java"
  - "backend/src/test/java/com/airline/dispatch/InvoiceDispatchTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceImmutabilityTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceUniquenessTest.java"
  - "backend/src/test/java/com/airline/invoices/CrossCurrencyValidationTest.java"
  - "backend/src/test/java/com/airline/pricing/MtowLookupTest.java"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "backend/src/main/java/com/airline/config/SpaWebMvcConfig.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "e2e/playwright.config.ts"
  - "e2e/tests/invoice-approval.spec.ts"
  - "e2e/tests/invoices.spec.ts"
proof: INTEGRATION
invariants:
  - INV-09
---

## Scope

Implements IATA IS-XML generation from approved invoices, PDF rendering via Thymeleaf + OpenPDF,
and email dispatch of both file formats to airline-configured email addresses when an invoice
transitions to `SENT` status.

## Approach

- XML: JAXB-annotated classes, marshalled and self-validated against bundled XSD
- PDF: Thymeleaf HTML template → OpenPDF
- Dispatch: Spring Boot Mail (SMTP) with Mailhog for local development
- Files stored as BYTEA in Postgres; downloadable via REST endpoints
