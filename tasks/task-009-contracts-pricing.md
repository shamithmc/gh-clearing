---
id: TASK-009
title: "Phase 2: Contract Data Model & Pricing Engine (2.1 & 2.2)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V4__contracts_and_services.sql"
  - "backend/src/main/java/com/airline/domain/ContractStatus.java"
  - "backend/src/main/java/com/airline/domain/FormulaType.java"
  - "backend/src/main/java/com/airline/domain/Contract.java"
  - "backend/src/main/java/com/airline/domain/ServiceConfiguration.java"
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/repository/ServiceConfigurationRepository.java"
  - "backend/src/main/java/com/airline/pricing/FormulaEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/UnitRateEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/UnitRateCompoundEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/SlabBasedIncrementalEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/SlabBasedAllUnitsEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/TimeBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/DayBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/evaluators/MtowBasedEvaluator.java"
  - "backend/src/main/java/com/airline/pricing/PricingEngine.java"
  - "backend/src/main/java/com/airline/pricing/PricingEvaluationException.java"
  - "backend/src/test/java/com/airline/pricing/PricingEngineTest.java"
proof: UNIT
invariants:
  - INV-12
---

# TASK-009 & 010: Contract Data Model & Pricing Formula Engine

Implements the base Contract entity, the 7 Pricing Formula Types (PF-01 through PF-07), and the Pricing Engine that computes costs based on formula configurations and flight inputs.
