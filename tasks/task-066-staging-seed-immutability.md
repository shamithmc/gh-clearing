---
id: TASK-066
title: "Make staging invoice seeds respect immutability"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-fix-render-staging-migration.md"
  - "tasks/task-066-staging-seed-immutability.md"
  - "backend/src/main/resources/db/staging/R__staging_seed_data.sql"
proof: INTEGRATION
invariants:
  - INV-08
  - INV-12
---

## Scope

1. Preserve immutable billing dates and totals when repeatable staging data encounters dispatched invoices.
2. Create new terminal-state samples and their billing lines while temporarily mutable, then transition them to their intended states.
3. Avoid invoking insert or billing-field update triggers for lines whose parent invoices are already terminal.
4. Continue refreshing permitted dispute workflow metadata without weakening the database triggers.
5. Prove a clean migration followed by two seed runs and a rollback-only rerun against existing seeded data.
6. Close merged task 065.

## Root cause

The repeatable staging seed recalculated relative dates and entered invoice-line
upserts on every deployment. After V30 enabled dispatched-content protection,
rerunning that seed correctly failed when those statements reached existing
`SENT`, `PAID`, and `DISPUTED` invoices.

## Authority acceptance

The user supplied the post-V30 Render failure log and approved continuing the
staging deployment remediation through the tracked pull-request workflow.
