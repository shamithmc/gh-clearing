---
id: TASK-049
title: "Fix Invoice PDF Rendering, Email Connection Handling, Mobile Responsive Layout & Cross-Platform Dev Scripts"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-049-pdf-rendering-fix.md"
  - "obligations.json"
  - "backend/src/main/java/com/airline/pdf/InvoicePdfService.java"
  - "backend/src/main/resources/templates/invoice-pdf.html"
  - "backend/src/main/java/com/airline/notification/EmailNotificationListener.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/index.css"
  - "stop-dev.sh"
  - "start-dev.sh"
  - "stop-dev.ps1"
  - "start-dev.ps1"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-12
---

## Scope

1. Fixes OpenPDF `HTMLWorker` parsing bug where `<style>` tag contents were emitted as plain text at the top of generated PDF documents. Refactors `invoice-pdf.html` to use clean HTML table structures and inline styles supported by OpenPDF, and strips `<style>` blocks prior to PDF conversion.
2. Gracefully handles `MailConnectException` / `MailSendException` in `EmailNotificationListener` and `InvoiceDispatchService` when running locally without an active local SMTP mail server (Mailhog) listening on port 1025, preventing connection refused stack trace dumps.
3. Fixes mobile viewport navigation layout in `MainLayout.tsx` and `index.css`: hides fixed desktop Sider on mobile screens, adds a sleek header hamburger toggle button with an animated slide-over drawer and backdrop overlay, while keeping the desktop navigation sidebar expanded by default.
4. Enhances `stop-dev.sh` and `start-dev.sh` with Windows `netstat`, `taskkill`, and `powershell` process termination fallbacks so the backend Java process on port 8080 is reliably terminated across Linux, macOS, and Windows environments, and adds `stop-dev.ps1` and `start-dev.ps1` helper scripts.
