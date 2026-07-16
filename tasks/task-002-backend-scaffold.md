---
id: TASK-002
title: "Scaffold backend Maven Spring Boot application"
owner: unassigned
paths:
  - "pom.xml"
  - "src/main/resources/application.yml"
proof: COMPILER
invariants:
  - INV-01
---

# TASK-002: Backend Scaffolding

This task establishes the Spring Boot 3.x backend scaffolding with multi-tenant structure and dependencies.

## Steps

1. **Scaffold Maven Files**:
   * Create a root `pom.xml` with dependencies allowlisted in `dependency-allowlist.json`.
   * Configure Java 21 compiler properties and standard Spring Boot starters.

2. **Configure Application Properties**:
   * Create `src/main/resources/application.yml` with default environment properties.
   * Add empty configuration blocks for Keycloak authentication and Flyway migration schemas.

3. **Verify Compliance**:
   * Verify that no dependencies outside of `dependency-allowlist.json` are present.
   * Run the compile phase (`mvn clean compile`) to verify the `COMPILER` proof kind.
