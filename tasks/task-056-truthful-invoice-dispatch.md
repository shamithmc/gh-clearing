---
id: TASK-056
title: "Make invoice dispatch state truthful"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-056-truthful-invoice-dispatch.md"
  - "obligations.json"
  - "backend/src/main/resources/db/migration/V28__invoice_dispatch_jobs.sql"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/main/java/com/airline/api/dto/InvoiceDispatchStatusResponse.java"
  - "backend/src/main/java/com/airline/config/E2eAsyncConfig.java"
  - "backend/src/main/java/com/airline/domain/InvoiceDispatchJob.java"
  - "backend/src/main/java/com/airline/domain/InvoiceDispatchStatus.java"
  - "backend/src/main/java/com/airline/repository/InvoiceDispatchJobRepository.java"
  - "backend/src/main/java/com/airline/service/DocumentGenerationJob.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchJobStateService.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/test/java/com/airline/dispatch/InvoiceDispatchTest.java"
  - "backend/src/test/java/com/airline/dispatch/InvoiceDispatchWorkflowIntegrationTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlineInvoiceViewerTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlinePaymentStatusTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/service/DocumentGenerationJobTest.java"
  - "backend/src/test/java/com/airline/xml/IataXmlComplianceTest.java"
  - "e2e/playwright.config.ts"
  - "e2e/tests/invoice-approval.spec.ts"
  - "frontend/src/pages/InvoicesList.tsx"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-08
  - INV-09
  - INV-12
---

## Scope

1. Persist tenant-scoped invoice dispatch jobs with queued, generating, failed, and delivered states.
2. Keep an invoice approved until both required documents are generated and delivery succeeds.
3. Persist actionable failure details and attempt counts without marking the invoice sent.
4. Reuse the unique job for retries and prevent delivered or concurrently claimed jobs from sending again.
5. Expose dispatch progress and failure evidence through the authorized invoice API.
