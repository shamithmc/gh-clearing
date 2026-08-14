---
id: TASK-064
title: "Deliver supplier pending-invoicing visibility"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-063-official-iata-conformance.md"
  - "tasks/task-064-pending-invoicing.md"
  - "backend/src/main/java/com/airline/api/DashboardController.java"
  - "backend/src/main/java/com/airline/api/OperationalFlightController.java"
  - "backend/src/main/java/com/airline/api/dto/OperationalFlightRequest.java"
  - "backend/src/main/java/com/airline/api/dto/PendingInvoicingResponse.java"
  - "backend/src/main/java/com/airline/domain/InvoiceLineItem.java"
  - "backend/src/main/java/com/airline/domain/OperationalFlight.java"
  - "backend/src/main/java/com/airline/repository/InvoiceLineItemRepository.java"
  - "backend/src/main/java/com/airline/repository/OperationalFlightRepository.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/service/OperationalFlightService.java"
  - "backend/src/main/java/com/airline/service/PendingInvoicingService.java"
  - "backend/src/main/resources/db/migration/V31__pending_invoicing.sql"
  - "backend/src/test/java/com/airline/contracts/InvoiceContractPeriodValidationTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlineInvoiceViewerTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlinePaymentStatusTest.java"
  - "backend/src/test/java/com/airline/reports/PendingInvoicingServiceTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/service/OperationalFlightServiceTest.java"
  - "frontend/src/pages/Dashboard.tsx"
  - "frontend/src/pages/SupplierPendingInvoicingPanel.tsx"
  - "e2e/tests/supplier-pending-invoicing.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-04
  - INV-05
  - INV-07
  - INV-08
  - INV-12
---

## Scope

1. Make operational flights tenant-, airline-, and airport-addressable and expose tenant-scoped ingestion.
2. Calculate due, uninvoiced `(operational flight, charge code)` work from approved contract services and their billing frequencies.
3. Apply tenant and dimensional restrictions before pricing or aggregation.
4. Keep currencies separate in totals and airline/airport breakdowns.
5. Link invoice lines to their source flight, use authoritative flight identity and quantity drivers, and prevent a service from being invoiced twice.
6. Add supplier dashboard summaries and a flight-service drilldown.
7. Prove due-date calculation, already-invoiced exclusion, tenant denial, clean migration, and the record-to-invoice lifecycle.
8. Close merged task 063.

## Authority acceptance

The user approved the forward-only schema design adding airline and airport identity
to the previously orphaned `operational_flights` table and a source-flight link to
invoice lines. Legacy operational rows remain readable while every new or updated
row must provide the new identity.
