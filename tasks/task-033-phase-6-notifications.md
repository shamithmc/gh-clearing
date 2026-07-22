---
id: TASK-033
title: "Phase 6.8: Airline Workflow Notifications"
owner: Shamith
paths:
  - "tasks/task-033-phase-6-notifications.md"
  - "backend/src/main/java/com/airline/notification/**"
  - "backend/src/main/java/com/airline/service/ContractReviewRequestService.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/service/InvoiceDispatchService.java"
  - "backend/src/main/resources/application.yml"
  - "backend/src/test/java/com/airline/notification/**"
  - "backend/src/test/java/com/airline/contracts/ContractReviewRequestServiceTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlinePaymentStatusTest.java"
  - "backend/src/test/java/com/airline/dispatch/InvoiceDispatchTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-08
---

## Scope

Completes Phase 6.8 notifications. Existing invoice dispatch continues to notify
airlines when a new invoice is sent. Contract review requests and airline payment
updates now publish after-commit email events to tenant-, role-, and
dimension-authorized ground-handler users.
