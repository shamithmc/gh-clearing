---
id: TASK-038
title: "Phase 7.5: SOR3 Supplier RFP Summary"
owner: Shamith
paths:
  - "tasks/task-038-supplier-rfp-summary.md"
  - "backend/src/main/java/com/airline/api/dto/SupplierRfpResponse.java"
  - "backend/src/main/java/com/airline/domain/SupplierRfpOutcome.java"
  - "backend/src/main/java/com/airline/domain/SupplierRfpResponseStatus.java"
  - "backend/src/main/java/com/airline/repository/RfpRepository.java"
  - "backend/src/main/java/com/airline/service/SupplierRfpService.java"
  - "backend/src/test/java/com/airline/rfp/SupplierRfpServiceTest.java"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/SupplierRfps.tsx"
  - "e2e/tests/supplier-rfps.spec.ts"
  - "e2e/tests/supplier-rfp-summary.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 7.5 SOR3. Ground handlers with `RFP_MONITOR` retain a complete
tenant-eligible, dimension-authorized history of received RFPs after award or
closure. The summary distinguishes response status from outcome, shows received,
responded, pending, and won metrics, supports airline/airport/status/outcome
filters, and permits new proposals only while an RFP remains published.
