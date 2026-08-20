---
id: TASK-075
title: "Configure SMTP Authentication Through Environment Variables"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/application.yml"
  - "tasks/task-fix-configurable-staging-smtp.md"
proof: CONFORMANCE
invariants:
  - INV-09
---

## Scope

Enable staging deployments to configure SMTP authentication and STARTTLS through
environment variables, so invoice email dispatch can use provider credentials
without placing secrets in version control.
