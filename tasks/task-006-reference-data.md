---
id: TASK-006
title: "Phase 1: Reference Data — IATA Charge Codes, Airlines, Airports (1.6-1.8)"
owner: Shamith
paths:
  - "backend/src/main/resources/db/migration/V2__seed_reference_data.sql"
  - "backend/src/main/java/com/airline/domain/ChargeCode.java"
  - "backend/src/main/java/com/airline/domain/Airline.java"
  - "backend/src/main/java/com/airline/domain/Airport.java"
  - "backend/src/main/java/com/airline/repository/ChargeCodeRepository.java"
  - "backend/src/main/java/com/airline/repository/AirlineRepository.java"
  - "backend/src/main/java/com/airline/repository/AirportRepository.java"
  - "backend/src/main/java/com/airline/api/dto/ChargeCodeResponse.java"
  - "backend/src/main/java/com/airline/api/dto/AirlineResponse.java"
  - "backend/src/main/java/com/airline/api/dto/AirportResponse.java"
  - "backend/src/main/java/com/airline/service/ReferenceDataService.java"
  - "backend/src/main/java/com/airline/api/ReferenceDataController.java"
  - "backend/src/test/java/com/airline/vocabularies/VocabularyEnforcementTest.java"
proof: UNIT
invariants:
  - INV-12
---

# TASK-006: Reference Data API (Phase 1.6 → 1.8)

Seeds IATA Charge Codes, Airline master, and Airport master via Flyway V2 migration and exposes read-only REST endpoints.
