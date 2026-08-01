---
id: TASK-RENDER-STORAGE-PATH-FIX
title: "Use Writable Local Storage Path on Render"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/application-staging.yml"
  - "tasks/task-render-storage-path-fix.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-12
---

## Scope

1. Configure staging file storage under Render's writable `/tmp` directory.
2. Preserve an environment-variable override for future persistent storage configuration.
