---
id: TASK-057
title: "Implement safe dispute attachments"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-057-safe-dispute-attachments.md"
  - "obligations.json"
  - "backend/src/main/resources/application.yml"
  - "backend/src/main/resources/db/migration/V29__dispute_attachments.sql"
  - "backend/src/main/java/com/airline/api/DisputeController.java"
  - "backend/src/main/java/com/airline/api/GlobalExceptionHandler.java"
  - "backend/src/main/java/com/airline/api/dto/DisputeAttachmentResponse.java"
  - "backend/src/main/java/com/airline/domain/DisputeAttachment.java"
  - "backend/src/main/java/com/airline/domain/DisputeAttachmentScanStatus.java"
  - "backend/src/main/java/com/airline/repository/DisputeAttachmentRepository.java"
  - "backend/src/main/java/com/airline/service/AttachmentMalwareScanner.java"
  - "backend/src/main/java/com/airline/service/AttachmentRejectedException.java"
  - "backend/src/main/java/com/airline/service/AttachmentScanUnavailableException.java"
  - "backend/src/main/java/com/airline/service/ClamAvAttachmentMalwareScanner.java"
  - "backend/src/main/java/com/airline/service/DisputeAttachmentService.java"
  - "backend/src/main/java/com/airline/service/LocalFileStorageService.java"
  - "backend/src/test/java/com/airline/api/DisputeControllerSecurityTest.java"
  - "backend/src/test/java/com/airline/disputes/DisputeAttachmentIntegrationTest.java"
  - "backend/src/test/java/com/airline/service/ClamAvAttachmentMalwareScannerTest.java"
  - "backend/src/test/java/com/airline/service/DisputeAttachmentServiceTest.java"
  - "backend/src/test/java/com/airline/service/FileStorageServiceTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-10
---

## Scope

1. Persist clean attachment metadata with tenant, uploader, integrity, and retention evidence.
2. Authorize upload, list, and download through the tenant- and dimension-scoped dispute aggregate.
3. Enforce a 10 MiB limit plus a PDF/PNG/JPEG MIME allowlist backed by magic-byte inspection.
4. Scan bytes through a fail-closed ClamAV boundary before any payload is stored or metadata is written.
5. Store payloads under tenant- and dispute-namespaced keys and reject path traversal.
6. Retain attachments for a configurable seven-year default with no user deletion endpoint.
7. Prove invalid type, spoofed MIME, oversize, scanner failure, unauthorized access, and tenant isolation.

## Authority acceptance

The user approved the forward-only V29 schema and the security/configuration defaults before implementation.
