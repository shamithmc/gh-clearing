---
id: TASK-015
title: "Phase 2: Audit Trail & MTOW Registry (2.7 & 2.8)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V7__contract_audit_logs.sql"
  - "backend/src/main/resources/db/migration/V8__mtow_registry.sql"
  - "backend/src/main/java/com/airline/domain/ContractAuditLog.java"
  - "backend/src/main/java/com/airline/repository/ContractAuditLogRepository.java"
  - "backend/src/main/java/com/airline/domain/MtowRecord.java"
  - "backend/src/main/java/com/airline/repository/MtowRecordRepository.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/MtowBasedEvaluator.java"
  - "backend/src/main/java/com/airline/api/MtowController.java"
  - "backend/src/test/java/com/airline/contracts/ContractLifecycleTest.java"
  - "backend/src/test/java/com/airline/pricing/PricingEngineTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
proof: UNIT
invariants: []
---

# TASK-015: Audit Trail & MTOW Registry

Implements Contract Action Audit Trails (Phase 2.7) and the MTOW Reference Data Registry (Phase 2.8) integrated into the calculation engine.
