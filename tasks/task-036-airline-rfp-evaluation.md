---
id: TASK-036
title: "Phase 7.3: Airline RFP Evaluation and Award"
owner: Shamith
paths:
  - "tasks/task-036-airline-rfp-evaluation.md"
  - "backend/src/main/java/com/airline/api/RfpController.java"
  - "backend/src/main/java/com/airline/api/dto/AirlineRfpProposalResponse.java"
  - "backend/src/main/java/com/airline/api/dto/RfpProposalDecisionRequest.java"
  - "backend/src/main/java/com/airline/api/dto/RfpProposalDecisionResponse.java"
  - "backend/src/main/java/com/airline/domain/Contract.java"
  - "backend/src/main/java/com/airline/domain/Rfp.java"
  - "backend/src/main/java/com/airline/domain/RfpProposal.java"
  - "backend/src/main/java/com/airline/repository/RfpProposalRepository.java"
  - "backend/src/main/java/com/airline/repository/RfpRepository.java"
  - "backend/src/main/java/com/airline/service/RfpEvaluationService.java"
  - "backend/src/main/resources/db/migration/V21__rfp_evaluation.sql"
  - "backend/src/test/java/com/airline/rfp/RfpEvaluationServiceTest.java"
  - "frontend/src/pages/AirlineRfps.tsx"
  - "e2e/tests/airline-rfp-evaluation.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-03
  - INV-12
---

## Scope

Implements Phase 7.3. Airline users with `RFP_RAISER` can compare proposals
only for tenant-owned, dimension-authorized RFPs, reject submitted proposals,
or accept one proposal and award the RFP. Acceptance rejects remaining bids and
can seed one traceable supplier-owned draft contract using the accepted rate and
the RFP's closed-vocabulary service dimensions.
