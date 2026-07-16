---
id: TASK-005
title: "Phase 1: Tenant & User Domain — JPA entities, repositories, services, REST controllers, security"
owner: Shamith
paths:
  - "backend/src/main/java/com/airline/domain/Tenant.java"
  - "backend/src/main/java/com/airline/domain/User.java"
  - "backend/src/main/java/com/airline/repository/TenantRepository.java"
  - "backend/src/main/java/com/airline/repository/UserRepository.java"
  - "backend/src/main/java/com/airline/service/TenantService.java"
  - "backend/src/main/java/com/airline/service/UserService.java"
  - "backend/src/main/java/com/airline/api/TenantController.java"
  - "backend/src/main/java/com/airline/api/UserController.java"
  - "backend/src/main/java/com/airline/api/dto/TenantRequest.java"
  - "backend/src/main/java/com/airline/api/dto/TenantResponse.java"
  - "backend/src/main/java/com/airline/api/dto/UserRequest.java"
  - "backend/src/main/java/com/airline/api/dto/UserResponse.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/GhClearingApplication.java"
  - "backend/pom.xml"
  - "dependency-allowlist.json"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
proof: UNIT
invariants:
  - INV-01
  - INV-02
---

# TASK-005: Phase 1 Backend — Tenant & User Domain API

Implements the JPA entity layer, REST API controllers, and Spring Security JWT resource server configuration for multi-tenant Tenant and User management.
