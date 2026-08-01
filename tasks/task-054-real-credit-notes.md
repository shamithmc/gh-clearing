---
id: TASK-054
title: "Real Credit Notes"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-054-real-credit-notes.md"
  - "obligations.json"
  - "backend/src/main/java/com/airline/api/CreditNoteController.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/main/java/com/airline/domain/CreditNote.java"
  - "backend/src/main/java/com/airline/domain/CreditNoteStatus.java"
  - "backend/src/main/java/com/airline/repository/CreditNoteRepository.java"
  - "backend/src/main/java/com/airline/repository/DisputeRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/service/CreditNoteDispatchService.java"
  - "backend/src/main/java/com/airline/service/CreditNoteService.java"
  - "backend/src/main/java/com/airline/service/DisputeService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/xml/CreditNoteXmlGeneratorService.java"
  - "backend/src/main/resources/db/migration/V27__credit_notes.sql"
  - "backend/src/main/resources/schema/README.md"
  - "backend/src/main/resources/schema/is-credit-note.xsd"
  - "backend/src/test/java/com/airline/api/CreditNoteControllerSecurityTest.java"
  - "backend/src/test/java/com/airline/disputes/CreditNoteValueLimitTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeServiceSecurityTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/xml/CreditNoteXmlGenerationTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-09
  - INV-11
  - INV-12
---

## Scope

1. Replace numeric-only invoice credits with a tenant-scoped credit-note aggregate and migration.
2. Serialize dispute acceptance and invoice credit issuance with pessimistic locks and a persisted cumulative-value guard.
3. Generate, validate, store, expose, and dispatch an application credit-note XML document with delivery evidence and audit events.
4. Remove the unrestricted direct invoice credit mutation endpoint; credit notes are issued only by an authorized dispute acceptance.
5. Keep the local XML namespace explicit and do not claim official IATA IS-XML conformance pending the separately governed licensed schema remediation.
