---
id: TASK-048
title: "UI Harmony: Ant Design + Tailwind CSS Conversion"
owner: Shamith
state: REVIEW
paths:
  - "tasks/task-048-ui-harmony-conversion.md"
  - ".gitignore"
  - "backend/src/main/java/com/airline/api/GlobalExceptionHandler.java"
  - "backend/src/main/java/com/airline/config/SecurityConfig.java"
  - "backend/src/main/java/com/airline/config/SpaWebMvcConfig.java"
  - "e2e/tests/airline-contract-expiry.spec.ts"
  - "e2e/tests/airline-expected-billing.spec.ts"
  - "e2e/tests/invoice-approval.spec.ts"
  - "e2e/tests/invoices.spec.ts"
  - "e2e/tests/pricing-benchmark.spec.ts"
  - "frontend/index.html"
  - "frontend/src/layout/MainLayout.tsx"
  - "frontend/src/pages/AirlineBilledAmountsPanel.tsx"
  - "frontend/src/pages/AirlineContractExpiryPanel.tsx"
  - "frontend/src/pages/AirlineContracts.tsx"
  - "frontend/src/pages/AirlineCurrentFootprintPanel.tsx"
  - "frontend/src/pages/AirlineDashboard.tsx"
  - "frontend/src/pages/AirlineExpectedBillingPanel.tsx"
  - "frontend/src/pages/AirlineInvoices.tsx"
  - "frontend/src/pages/AirlineReviewRequests.tsx"
  - "frontend/src/pages/AirlineRfps.tsx"
  - "frontend/src/pages/AirportCostIndex.tsx"
  - "frontend/src/pages/ContractReviewRequests.tsx"
  - "frontend/src/pages/ContractWizard.tsx"
  - "frontend/src/pages/ContractsList.tsx"
  - "frontend/src/pages/Dashboard.tsx"
  - "frontend/src/pages/InvoiceWizard.tsx"
  - "frontend/src/pages/InvoicesList.tsx"
  - "frontend/src/pages/Marketplace.tsx"
  - "frontend/src/pages/PricingBenchmarkPanel.tsx"
  - "frontend/src/pages/ServiceOfferings.tsx"
  - "frontend/src/pages/SupplierOperationalFootprintPanel.tsx"
  - "frontend/src/pages/SupplierRfps.tsx"
proof: E2E
invariants:
  - INV-01
  - INV-02
  - INV-12
---

## Scope

Converts all platform UI pages to Ant Design + Tailwind CSS Harmony design system, replacing legacy Ant Design layout wrappers with Tailwind CSS utilities and Lucide icons while retaining complex interactive Ant Design components (Table, Select, Form, DatePicker, Steps, Modal, Spin, Alert). Preserves all data-testid attributes and resilient selectors across E2E test specs.
