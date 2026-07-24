---
id: TASK-049
title: "Fix Invoice PDF Rendering & Email Connection Failure Handling"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-049-pdf-rendering-fix.md"
  - "backend/src/main/java/com/airline/pdf/InvoicePdfService.java"
  - "backend/src/main/resources/templates/invoice-pdf.html"
  - "backend/src/main/java/com/airline/notification/EmailNotificationListener.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
proof: INTEGRATION
invariants:
  - INV-01
---

## Scope

1. Fixes OpenPDF `HTMLWorker` parsing bug where `<style>` tag contents were emitted as plain text at the top of generated PDF documents. Refactors `invoice-pdf.html` to use clean HTML table structures and inline styles supported by OpenPDF, and strips `<style>` blocks prior to PDF conversion.
2. Gracefully handles `MailConnectException` / `MailSendException` in `EmailNotificationListener` and `InvoiceDispatchService` when running locally without an active local SMTP mail server (Mailhog) listening on port 1025, preventing connection refused stack trace dumps.
