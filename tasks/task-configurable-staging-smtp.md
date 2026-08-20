---
id: TASK-075
title: "Configure SMTP Authentication Through Environment Variables"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/application.yml"
  - "tasks/task-configurable-staging-smtp.md"
proof: UNIT
invariants:
  - INV-01
---

## Scope

Enable staging deployments to configure SMTP authentication and STARTTLS through
environment variables, so invoice email dispatch can use provider credentials
without placing secrets in version control.
