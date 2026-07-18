---
id: TASK-024
title: "Phase 4.7: File Storage"
owner: Shamith
paths:
  - "tasks/task-024-file-storage.md"
  - ".gitignore"
  - "backend/src/main/resources/db/migration/V14__add_invoice_file_keys.sql"
  - "backend/src/main/java/com/airline/domain/Invoice.java"
  - "backend/src/main/java/com/airline/service/FileStorageService.java"
  - "backend/src/main/java/com/airline/service/LocalFileStorageService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/api/InvoiceController.java"
  - "backend/src/test/java/com/airline/service/FileStorageServiceTest.java"
  - "backend/src/test/java/com/airline/invoices/InvoiceAuditLogTest.java"
proof: INTEGRATION
invariants:
  - INV-08
  - INV-09
---

## Scope
Implements file storage abstraction for generated invoice documents, moving away from heavy SQL binary columns to configurable file storage keys.
