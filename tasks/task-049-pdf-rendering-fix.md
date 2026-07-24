---
id: TASK-049
title: "Fix Invoice PDF Rendering & Raw CSS Leakage"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-049-pdf-rendering-fix.md"
  - "backend/src/main/java/com/airline/pdf/InvoicePdfService.java"
  - "backend/src/main/resources/templates/invoice-pdf.html"
proof: INTEGRATION
invariants:
  - INV-01
---

## Scope

Fixes OpenPDF `HTMLWorker` parsing bug where `<style>` tag contents were emitted as plain text at the top of generated PDF documents. Refactors `invoice-pdf.html` to use clean HTML table structures and inline styles supported by OpenPDF, and strips `<style>` blocks prior to PDF conversion.
