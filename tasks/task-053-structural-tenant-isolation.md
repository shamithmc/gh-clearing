---
id: TASK-053
title: "Structural Tenant Isolation"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-053-structural-tenant-isolation.md"
  - "obligations.json"
  - "backend/src/main/java/com/airline/config/DevUserInitializer.java"
  - "backend/src/main/java/com/airline/repository/ContractAuditLogRepository.java"
  - "backend/src/main/java/com/airline/repository/ContractRepository.java"
  - "backend/src/main/java/com/airline/repository/ContractReviewRequestRepository.java"
  - "backend/src/main/java/com/airline/repository/DisputeRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceAuditLogRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceLineItemRepository.java"
  - "backend/src/main/java/com/airline/repository/InvoiceRepository.java"
  - "backend/src/main/java/com/airline/repository/MarketIntelligenceAggregate.java"
  - "backend/src/main/java/com/airline/repository/MarketIntelligenceRepository.java"
  - "backend/src/main/java/com/airline/repository/RfpProposalRepository.java"
  - "backend/src/main/java/com/airline/repository/RfpRepository.java"
  - "backend/src/main/java/com/airline/repository/ServiceConfigurationRepository.java"
  - "backend/src/main/java/com/airline/repository/ServiceOfferingRepository.java"
  - "backend/src/main/java/com/airline/repository/SupplierConfigurationRepository.java"
  - "backend/src/main/java/com/airline/repository/TenantScopedRepository.java"
  - "backend/src/main/java/com/airline/repository/UserRepository.java"
  - "backend/src/main/java/com/airline/security/DimensionalSecurityEvaluator.java"
  - "backend/src/main/java/com/airline/service/AirportCostIndexService.java"
  - "backend/src/main/java/com/airline/service/DocumentGenerationJob.java"
  - "backend/src/main/java/com/airline/service/InvoiceService.java"
  - "backend/src/main/java/com/airline/service/PricingBenchmarkService.java"
  - "backend/src/main/java/com/airline/service/RfpEvaluationService.java"
  - "backend/src/main/java/com/airline/service/ServiceMarketplaceService.java"
  - "backend/src/main/java/com/airline/service/SupplierConfigurationService.java"
  - "backend/src/main/java/com/airline/service/UserService.java"
  - "backend/src/test/java/com/airline/contracts/ContractLifecycleTest.java"
  - "backend/src/test/java/com/airline/contracts/ContractReviewRequestServiceTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlineInvoiceViewerTest.java"
  - "backend/src/test/java/com/airline/invoices/AirlinePaymentStatusTest.java"
  - "backend/src/test/java/com/airline/marketintelligence/AirportCostIndexServiceTest.java"
  - "backend/src/test/java/com/airline/marketplace/ServiceMarketplaceServiceTest.java"
  - "backend/src/test/java/com/airline/pricing/PricingBenchmarkServiceTest.java"
  - "backend/src/test/java/com/airline/rfp/RfpEvaluationServiceTest.java"
  - "backend/src/test/java/com/airline/rfp/RfpServiceTest.java"
  - "backend/src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "backend/src/test/java/com/airline/security/MarketIntelligenceTenantBoundaryTest.java"
  - "backend/src/test/java/com/airline/security/SupplierConfigurationSecurityTest.java"
  - "backend/src/test/java/com/airline/security/TenantIsolationTest.java"
  - "backend/src/test/java/com/airline/service/DocumentGenerationJobTest.java"
  - "backend/src/test/java/com/airline/service/UserServiceTest.java"
proof: INTEGRATION
invariants:
  - INV-01
---

## Scope

1. Remove unrestricted inherited reads from tenant-owned business repositories.
2. Require tenant or authorized-parent keys in invoice, contract, dispute, audit, user, RFP, marketplace, and background-job reads.
3. Replace raw cross-tenant invoice scans with a PostgreSQL aggregation boundary that enforces the two-supplier threshold before returning data.
4. Prove structurally that tenant repositories cannot expose generic reads and verify the market boundary against PostgreSQL.
