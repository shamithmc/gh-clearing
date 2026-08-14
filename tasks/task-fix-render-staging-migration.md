---
id: TASK-065
title: "Recover Render staging database migration"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-fix-render-staging-migration.md"
  - "obligations.json"
  - "backend/src/main/resources/db/migration/beforeMigrate__normalize_dispute_message_actions.sql"
  - "backend/src/main/resources/db/staging/R__staging_seed_data.sql"
proof: INTEGRATION
invariants:
  - INV-12
---

## Scope

1. Normalize legacy staging dispute-message creation and status values into the closed action vocabulary before V30 runs.
2. Preserve the immutable V30 migration checksum for databases where the integrity migration already succeeded.
3. Make staging seed inserts and conflict updates write only actions accepted by the V30 check constraint.
4. Keep the recovery idempotent for fresh databases, V29 staging databases, and databases already beyond V30.

## Root cause

The staging repeatable seed stored `CREATED` and dispute status values in
`dispute_messages.action`. V30 correctly restricted that column to the actions
emitted by `DisputeService`, so Render could not advance the existing staging
schema from V29.

## Authority acceptance

The user supplied the Render failure log and explicitly requested the diagnosed
deployment fix be tracked as a task and published as a pull request.
