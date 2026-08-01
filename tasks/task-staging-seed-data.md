---
id: TASK-STAGING-SEED-DATA
title: "Add Complete Staging Demo Dataset"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/application-staging.yml"
  - "backend/src/main/resources/db/staging/R__staging_seed_data.sql"
  - "tasks/task-staging-seed-data.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-12
---

## Scope

1. Isolate business demo data to the staging Spring profile.
2. Seed airline and ground-handler records for every contract, invoice, RFP,
   proposal, and dispute workflow status.
3. Populate dashboards, reviews, marketplace, expected billing, operational
   footprint, cost index, pricing benchmarks, audit histories, and scoped users.
