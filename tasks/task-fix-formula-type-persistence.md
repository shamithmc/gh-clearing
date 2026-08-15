---
id: TASK-067
title: "Persist pricing formula vocabulary values"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-fix-formula-type-persistence.md"
  - "backend/src/main/java/com/airline/domain/FormulaTypeConverter.java"
  - "backend/src/main/java/com/airline/domain/ServiceConfiguration.java"
  - "backend/src/test/java/com/airline/domain/FormulaTypeConverterTest.java"
proof: UNIT
invariants:
  - INV-01
  - INV-12
---

## Scope

1. Persist pricing formula types using their canonical `PF-01` through `PF-07` values.
2. Load existing contract service records without relying on Java enum constant names.
3. Prove the conversion and entity mapping without database changes.

## Root cause

Hibernate's enum-name mapping expected values such as `PF_01`, while the closed
formula vocabulary is stored using canonical values such as `PF-01`.
