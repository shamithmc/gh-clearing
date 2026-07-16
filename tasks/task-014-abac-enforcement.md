---
id: TASK-014
title: "Phase 2: ABAC Enforcement (2.6)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V6__user_dimensional_restrictions.sql"
  - "backend/src/main/java/com/airline/domain/User.java"
  - "backend/src/main/java/com/airline/api/dto/UserResponse.java"
  - "backend/src/main/java/com/airline/api/dto/UserRequest.java"
  - "backend/src/main/java/com/airline/security/DimensionalSecurityEvaluator.java"
  - "backend/src/main/java/com/airline/service/ContractService.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
proof: UNIT
invariants:
  - INV-02
---

# TASK-014: ABAC Enforcement & Dimensional Scope

Implements Attribute-Based Access Control (ABAC) / Dimensional Scope (INV-02) by restricting read/write contract operations to a user's permitted airports, airlines, and service types.
