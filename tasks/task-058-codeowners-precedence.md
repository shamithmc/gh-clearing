---
id: TASK-058
title: "Enforce CODEOWNERS precedence"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-058-codeowners-precedence.md"
  - "CODEOWNERS"
  - ".github/scripts/validate_codeowners.py"
  - ".github/workflows/ci.yml"
proof: UNIT
invariants:
  - INV-12
---

## Scope

1. Put the default and broad application ownership rules before narrower protected paths.
2. Preserve DB Admin ownership for migrations, DevOps ownership for topology, Platform Admin ownership for product specifications, and Tech Lead ownership for canonical contracts and decision logs.
3. Add a CI regression check that evaluates representative paths using GitHub's last-matching-rule precedence.

## Authority acceptance

The user approved task 058 as a Tier 3 CODEOWNERS and CI configuration change before implementation.
