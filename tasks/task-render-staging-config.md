---
id: TASK-RENDER-STAGING
title: "Add Render Staging Deployment Configuration"
owner: Shamith
state: REVIEW
paths:
  - "backend/src/main/resources/deploy/Dockerfile"
  - "backend/src/main/resources/deploy/Dockerfile.dockerignore"
  - "backend/src/main/resources/deploy/render.yaml"
  - "backend/src/main/java/com/airline/config/DevUserInitializer.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/security/DevAuthFilter.java"
  - "backend/src/main/resources/application.yml"
  - "tasks/task-render-staging-config.md"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-12
---

## Scope

1. Define a Render Blueprint for an isolated staging web service and PostgreSQL database.
2. Package the Vite frontend and Spring Boot backend in a multi-stage container image.
3. Configure Render's runtime port, staging-only simulated authentication, and disabled outbound email behavior.
