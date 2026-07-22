---
id: TASK-037
title: "Phase 7.4: Service Provider Marketplace"
owner: Shamith
paths:
  - "tasks/task-037-service-provider-marketplace.md"
  - "backend/src/main/java/com/airline/api/ServiceMarketplaceController.java"
  - "backend/src/main/java/com/airline/api/dto/ServiceOfferingCreateRequest.java"
  - "backend/src/main/java/com/airline/api/dto/ServiceOfferingResponse.java"
  - "backend/src/main/java/com/airline/domain/ServiceOffering.java"
  - "backend/src/main/java/com/airline/repository/ServiceOfferingRepository.java"
  - "backend/src/main/java/com/airline/service/ServiceMarketplaceService.java"
  - "backend/src/main/resources/db/migration/V22__service_provider_marketplace.sql"
  - "backend/src/test/java/com/airline/marketplace/ServiceMarketplaceServiceTest.java"
  - "frontend/src/App.tsx"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineRfps.tsx"
  - "frontend/src/pages/Marketplace.tsx"
  - "frontend/src/pages/ServiceOfferings.tsx"
  - "e2e/tests/service-provider-marketplace.spec.ts"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Implements Phase 7.4. Ground handlers with `RFP_MONITOR` can publish and remove
tenant-owned service offerings only for configured, dimension-authorized
airports and closed-vocabulary service types. Airlines with `RFP_RAISER` browse
only eligible offerings within their airport, airline, and service scope, filter
them by airport or region, and initiate a pre-populated RFP from an offering.
