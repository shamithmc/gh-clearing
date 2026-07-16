---
id: TASK-004
title: "Create initial multi-tenant database tables and migrations"
owner: Shamith
paths:
  - "src/main/resources/db/migration/V1__init_schema.sql"
  - "src/test/java/com/airline/security/TenantIsolationTest.java"
  - "src/test/java/com/airline/security/DimensionalAccessTest.java"
  - "src/test/java/com/airline/vocabularies/VocabularyEnforcementTest.java"
proof: INTEGRATION
invariants:
  - INV-01
  - INV-02
  - INV-12
---

# TASK-004: Database Schema Migration

This task establishes the base database schema with the necessary tables and multi-tenant constraints.

## Steps

1. **Write Flyway Migration**:
   * Create `src/main/resources/db/migration/V1__init_schema.sql`.
   * Define tables for the 8 core kernel primitives:
     * `tenants` (defines tenant id, name, type: `GROUND_HANDLER` | `AIRLINE` | `PLATFORM_ADMIN`).
     * `users` (defines user details and roles associated with a tenant).
     * `contracts` (defines counterparties, dates, active airports, status).
     * `services` (maps contracts to IATA charge codes).
     * `operational_flights` (captures flight details, dates, tail ID, quantities).
     * `invoices` (header totals, statuses, due dates, linked contract).
     * `disputes` (categories, statuses, attachments, line items).
     * `credit_notes` (value, status, linked dispute).

2. **Enforce Tenant Isolation**:
   * Add `tenant_id` discriminator column to all tenant-specific tables.
   * Create unique constraints on `(tenant_id, invoice_number)` for the invoice table to enforce `INV-07`.

3. **Verify Schemas**:
   * Run the Flyway migration test suite to verify the `INTEGRATION` proof kind, ensuring migrations compile and run cleanly against a test PostgreSQL instance.
