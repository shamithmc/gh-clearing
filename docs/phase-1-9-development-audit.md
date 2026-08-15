# Phase 1–9 Development Audit

**System:** Airline Ground Handling Cost Management Platform (`GH-Project`)
**Audit date:** 2026-07-31
**Basis:** `docs/architecture-contract.md`, `docs/development-contract.md`, and `docs/PHASES.md`
**Method:** Static inspection with line-level evidence, manifest/path validation, and local execution of backend, frontend, build, and E2E suites.

## Remediation reconciliation (2026-08-15)

This section supersedes the remediation status statements in the original
2026-07-31 audit. The original evidence and findings are retained below as the
point-in-time audit record; they must not be read as the current repository
state. Reconciliation is based on merged `main` through PR #87 and successful
main-branch CI for that commit.

### Prioritized backlog disposition

| Original finding | Current disposition | Remediation evidence |
|---|---|---|
| Unsupported IATA conformance claim | **Truthful but externally blocked** | PRs #82 and #83 classify the bundled contracts as application-owned and record the verified official v4.4.0.0 upstream URL and digest. Official conformance still requires IATA usage/redistribution authority and the imported Base Datatypes and Main Dictionary schema set. |
| Structural tenant isolation and unsafe market scans | **Resolved** | PR #71 introduced mandatory tenant-scoped repositories and an explicit anonymized market-intelligence aggregation boundary. The SQL boundary retains the minimum-two-supplier threshold and does not return supplier identities or raw observations. |
| Unsafe dispute actions and transitions | **Resolved** | PR #68 added party/role authorization, dimensional checks, and guarded state transitions. |
| Numeric-only credit notes | **Resolved at the application-contract level** | PR #73 added durable credit-note records, generation, storage, dispatch, and tests. Official IATA conformance remains part of the shared external blocker above. |
| Premature invoice `SENT` state | **Resolved** | PR #76 added durable dispatch jobs, actionable failure state, idempotent retry, and delivery-gated invoice state. |
| Unsafe/missing dispute attachments | **Resolved** | PR #77 added tenant/object authorization, content controls, scan boundary, tenant-namespaced storage, retention metadata, and negative tests. |
| Invoice contract-period validation | **Resolved** | PR #80 validates every linked flight date against the approved contract period. |
| Missing database integrity controls | **Resolved** | PR #81 added identity/FK/vocabulary/value constraints and dispatched-content protection. |
| E2E isolation and reliability | **Resolved for the reported failures** | PR #66 repaired the audit-reproduced failures; subsequent remediation PRs have passed the full CI Playwright gate. |
| Incomplete governance mechanics | **Resolved** | PRs #78 and #79 corrected CODEOWNERS precedence and completed work-unit, obligation, topology, gate, dependency, frontend-test, and billing-path controls. |
| Missing SFR4 pending invoicing | **Resolved** | PR #84 added tenant-scoped operational-flight ingestion, due uninvoiced service calculation, currency-safe summaries, dashboard drill-down, and lifecycle tests. |
| PF-07 aircraft-type fallback ambiguity | **Closed by re-audit** | The architecture requires an operational tail ID; an unknown registered tail falls back to the aircraft-type default and fails closed when neither reference exists. No authority amendment was required. |

PRs #85-#87 are post-remediation stability corrections for staging migration
recovery, immutable seed reruns, and canonical formula-type persistence.

### Remaining work

1. **External authority blocker — official IATA IS-XML.** The repository cannot
   claim or execute official conformance until written authority and the complete
   imported official schema set are supplied with reviewable provenance. Local
   invoice and credit-note contract validation remains useful but is not IATA
   certification or clearing-house compatibility.
2. **Administration and configuration UI.** `/configuration` is still a
   placeholder, and supplier/airline tenant, user, role, and dimensional-scope
   administration has secured APIs but no complete frontend workflow.
3. **Contract formula authoring UI.** The contract wizard selects all seven
   formulas but does not provide complete structured editors for tiers, slabs,
   time bands, and day rates.
4. **Production platform hardening.** File storage remains local-disk based;
   general notification delivery lacks a durable retry/status record outside
   the invoice/credit-note dispatch workflows.
5. **Reporting completeness.** The supplier dashboard does not expose the full
   specified dimension-filter matrix, and SDR1/ADR1 remain client-derived cards
   rather than dedicated secured report endpoints.
6. **Test and performance depth.** Frontend unit coverage remains sparse;
   integration tests require an externally provisioned PostgreSQL service; no
   single browser test proves login through the entire contract-to-dispute
   journey; and the frontend still needs route-level splitting and a bundle
   performance budget.

### Current gate interpretation

- **Level 1 Core/Complete:** application workflows are materially remediated,
  but official IATA conformance and production storage readiness still prevent
  an unconditional production-ready declaration.
- **Level 2 Complete:** the audit's market-confidentiality and SFR4 blockers are
  resolved, subject to inherited lower-level blockers and remaining filter/UI
  completeness.
- **Level 3 Start:** dispute authorization, attachments, credit-note workflow,
  database integrity, and dispatch truthfulness are remediated; official XML
  conformance remains inherited and reporting depth remains incomplete.

## 1. Executive Summary

### Overall assessment

The repository contains substantial working functionality through Phase 8 and the beginnings of Phase 9, but it is **not ready for production go-live**. The most important blockers are not cosmetic completeness gaps: the bundled “IATA” XSD is explicitly a lean application schema rather than the official IATA artifact, tenant isolation is not universally applied at repository boundaries, and Phase 9 exposes insufficiently authorized dispute and credit-note mutations while not producing an actual credit-note document.

| Phase | RAG | Summary |
|---|---|---|
| 1 – Foundation | 🟡 Amber | Backend foundations exist; environment promotion, registration/admin UI, Redis/S3 readiness, and supplier configuration UI are incomplete. |
| 2 – Contracts | 🟡 Amber | Core lifecycle, seven evaluators, ABAC, and audit logging exist; wizard/formula configuration and PF-07 fallback semantics need correction. |
| 3 – Invoicing | 🟡 Amber | Core invoice calculation and lifecycle work; contract-period validation uses invoice issue date rather than each flight date and DB immutability is absent. |
| 4 – XML/PDF/Dispatch | 🔴 Red | Local XML validation, PDF, email, and async code exist, but the XSD is not the official IATA schema and async dispatch failures leave the invoice `SENT`. |
| 5 – Supplier MIS | 🟡 Amber | Supplier metrics and dashboard are implemented, but the full specified filter framework and comprehensive report/security tests are incomplete. |
| 6 – Airline Collaboration | 🟡 Amber | Airline views, review requests, payment, and event notifications exist; onboarding/admin UI and notification coverage are partial. |
| 7 – RFP/Marketplace | 🟡 Amber | Main workflows and pages exist; contract seeding and tenant/role enforcement lack controller-level defense and full integration coverage. |
| 8 – Market Intelligence | 🔴 Red | Most dashboards exist, but SFR4 is missing, global invoice scans violate the tenant-query invariant, and the cost-index E2E journey fails. |
| 9 – Disputes | 🔴 Red | Basic queue/thread/status data exists; attachments, party-specific transition authorization, real credit notes, credit-note XML/dispatch, and a reliable E2E flow do not. |

### Top five critical findings

1. **The IATA conformance claim is unsupported.** The schema README calls `is-invoice.xsd` a “lean, self-contained application schema” (`backend/src/main/resources/schema/README.md:21-24`) while its metadata asserts `official: true` (`backend/src/main/resources/schema/is-invoice.provenance.json:2-7`). `IsXmlGeneratorService` validates only against that local schema (`backend/src/main/java/com/airline/xml/IsXmlGeneratorService.java:128-138`). This fails INV-09 and blocks Level 1 Core.
2. **INV-01 is not enforced for every business query.** `InvoiceRepository.findByStatusIn` has no tenant predicate (`backend/src/main/java/com/airline/repository/InvoiceRepository.java:21-22`) and is used for global market scans (`backend/src/main/java/com/airline/service/AirportCostIndexService.java:79`; `backend/src/main/java/com/airline/service/PricingBenchmarkService.java:83`). Audit-log and dispute lookup methods also omit tenant predicates (`ContractAuditLogRepository.java:11`, `InvoiceAuditLogRepository.java:8`, `DisputeRepository.java:24`).
3. **Phase 9 mutations lack party/role authorization and a guarded state machine.** The dispute controller has no `@PreAuthorize` rules (`backend/src/main/java/com/airline/api/DisputeController.java:13-44`); `createDispute` does not require an airline tenant and hard-codes the sender as `AIRLINE` (`DisputeService.java:48-59,125-133`); `respondToDispute` lets either party request ACCEPT/REJECT/ESCALATE without transition guards (`DisputeService.java:139-175`).
4. **A “credit note” is only an accumulated numeric field.** Acceptance calls `generateCreditNote`, which only increments `Invoice.creditNoteAmount` and writes an audit entry (`InvoiceService.java:330-349`). V9 dropped the original credit-note table (`V9__invoice_schema.sql:1`), and V26 creates no replacement (`V26__dispute_management.sql:1-43`). There is no credit-note XML generation, official-schema validation, file, or email dispatch.
5. **Dispatch can claim success before delivery and fail silently.** The invoice is persisted as `SENT` before the async job runs (`InvoiceService.java:237-259`); the job loads globally by ID (`DocumentGenerationJob.java:43`), catches every exception, only logs it, and never restores/marks an error state (`DocumentGenerationJob.java:60-67`).

### Top three development-contract violations

1. **Mechanical review/branch protection is not represented in-repository.** Only one CI workflow exists; no branch-protection rules or review-enforcement configuration is present. CI runs validators, but does not encode the Tier 2/Tier 3 independent approval rules from development contract §6.
2. **Work-unit hygiene is materially broken.** All 11 task files are in `REVIEW`, exceeding the concurrency ceiling of three (§8), and `task-041-governance-remediation.md` declares 44 paths of which 30 no longer exist (for examples, lines 10-16 and 25-50).
3. **The conformance/coverage gates overstate protection.** CI’s explicit conformance step runs only when the task declares `CONFORMANCE` (`.github/workflows/ci.yml:103-107`), not based on billing-path changes as §7.6 requires; JaCoCo is scoped only to `com/airline/pricing/**` (`backend/pom.xml:128-164`); only Phase 3 and governance gate files exist.

## 2. Phase-by-Phase Deliverable Matrix

Status means conformance to the complete specification, not merely the presence of a similarly named class.

### Phase 1 – Foundation & Onboarding

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 1.1 Project scaffolding | ⚠️ Partial | `backend/pom.xml`; `frontend/package.json`; `.github/workflows/ci.yml:1-118`; only local Docker topology, no staging/prod definitions | High |
| 1.2 Database setup | ✅ Complete | Flyway V1–V26; PostgreSQL service in `docker-compose.yml`; migrations ran cleanly in backend test execution | Medium |
| 1.3 Authentication & identity | ⚠️ Partial | OAuth2 resource server and JWT conversion at `SecurityConfig.java:28-55,72-87`; no registration flow or realm provisioning artifact | High |
| 1.4 Tenant management | ✅ Complete | `TenantController.java:18-43`; `TenantService.java`; tenant table at `V1__init_schema.sql:5-12` | Low |
| 1.5 User/role management | ⚠️ Partial | `UserController.java`; closed role sets in `UserService.java:23-32`; no frontend user/role admin page | High |
| 1.6 IATA charge codes | ✅ Complete | Seed migration `V2__seed_reference_data.sql:5-38`; 25-code assertion `VocabularyEnforcementTest.java:41-57` | Low |
| 1.7 Airline reference data | ✅ Complete | `V2__seed_reference_data.sql:40-73`; `ReferenceDataController.java` / `ReferenceDataService.java` | Low |
| 1.8 Airport reference data | ✅ Complete | `V2__seed_reference_data.sql:75+`; coordinates and checks in `V25__airport_coordinates.sql:3-40` | Low |
| 1.9 Supplier configuration | ⚠️ Partial | Backend schema/service/controller exists (`V3__supplier_configuration.sql`; `SupplierConfigurationController.java`), but `/configuration` renders a placeholder (`frontend/src/App.tsx:46`) | High |
| 1.10 Landing page | ✅ Complete | `frontend/src/pages/Dashboard.tsx`; routed by `frontend/src/App.tsx:22-31` | Low |

### Phase 2 – Contract Management

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 2.1 Contract data model | ✅ Complete | `Contract.java`, `ServiceConfiguration.java`; `V1__init_schema.sql:24-47`, V4/V5/V24 extensions | Low |
| 2.2 Seven-formula engine | ⚠️ Partial | Seven evaluators under `pricing/evaluators/`; deterministic numeric guard at `PricingValidation.java:10-23`; PF-07 rejects aircraft-type-only fallback (`MtowBasedEvaluator.java:34-42`) | High |
| 2.3 Contract entry UI | ⚠️ Partial | `ContractWizard.tsx`; one generic rate field rather than complete formula-specific structured forms (`ContractWizard.tsx:170-208`) | High |
| 2.4 Listing and filters | ✅ Complete | `ContractsList.tsx`; API filters in `ContractController.java:26-31` | Low |
| 2.5 Approval workflow | ✅ Complete | Strict transitions in `ContractService.java:156-190`; `ContractLifecycleTest.java` | Low |
| 2.6 ABAC enforcement | ✅ Complete | Create/read/transition checks in `ContractService.java:45,127-129,154`; `DimensionalAccessTest.java` | Medium |
| 2.7 Audit trail | ✅ Complete | `V7__contract_audit_logs.sql`; writes in `ContractService.java:203-223`; lifecycle tests verify audit saves | Low |
| 2.8 MTOW reference data | ✅ Complete | `V8__mtow_registry.sql`, V16 defaults; `MtowController.java`; `MtowLookupTest.java` | Medium |

### Phase 3 – Invoice Creation & Calculation

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 3.1 Invoice model | ✅ Complete | `Invoice.java`, `InvoiceLineItem.java`; V9/V11/V17/V23 | Low |
| 3.2 Invoice entry UI | ✅ Complete | `InvoiceWizard.tsx`; unit coverage in `InvoiceEntryWizard.test.tsx` | Medium |
| 3.3 Auto-calculation | ✅ Complete | `InvoiceService.java:383-442`; `PricingEngineTest.java` | Low |
| 3.4 Cross-currency | ✅ Complete | Positive rate and source enforced at `InvoiceService.java:423-434`; `CrossCurrencyValidationTest.java` | Low |
| 3.5 Invoice validation | ⚠️ Partial | Pair uniqueness enforced (`InvoiceService.java:366-380`, `V17:3-4`), but validity checks invoice issue date, not every line’s flight date (`InvoiceService.java:398-400`) | High |
| 3.6 Invoice listing | ✅ Complete | `InvoicesList.tsx`; tenant/dimension/status filters at `InvoiceService.java:125-148` | Low |
| 3.7 Edit and lock | ⚠️ Partial | Update/delete application guards at `InvoiceService.java:151-160,352-363`; no DB trigger or row policy | High |
| 3.8 Audit trail | ✅ Complete | `V10__invoice_audit_logs.sql`; `InvoiceService.java:508-523`; `InvoiceAuditLogTest.java` | Low |

### Phase 4 – Approval, XML/PDF and Dispatch

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 4.1 Approval workflow | ✅ Complete | Transition guards at `InvoiceService.java:219-239`; `invoice-approval.spec.ts` | Medium |
| 4.2 IATA IS-XML | ❌ Missing as specified | JAXB/local XML exists, but README admits a lean application schema rather than official IATA (`schema/README.md:21-24`) | Critical |
| 4.3 PDF generation | ✅ Complete | `InvoicePdfService.java`; HTML template; PDF integration tests pass with PostgreSQL present | Low |
| 4.4 Invoice dispatch | ⚠️ Partial | `InvoiceDispatchService.java:44-76`; async job dispatch at `DocumentGenerationJob.java:46-64`; failure has no durable error state | Critical |
| 4.5 Payment tracking | ✅ Complete | `InvoiceService.java:265-288`; `AirlinePaymentStatusTest.java` | Low |
| 4.6 Lightweight disputed status | ✅ Complete | `InvoiceService.java:260-267,292-327`; line-item dispute fields in V13 | Medium |
| 4.7 File storage | ⚠️ Partial | Download endpoints `InvoiceController.java:67-100`; implementation is local disk (`LocalFileStorageService.java:18-52`), not S3/blob | High |
| 4.8 Background processing | ⚠️ Partial | `@Async` job (`DocumentGenerationJob.java:38-67`); no queued/retry/error status shown to user | High |

### Phase 5 – Supplier MIS & Dashboards

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 5.1 Dashboard framework | ⚠️ Partial | Reusable dashboard exists, but current supplier UI exposes airline/airport filters rather than all six specified dimensions (`Dashboard.tsx:455-473`) | Medium |
| 5.2 SFR1 receivables | ✅ Complete | `DashboardService.java`; dashboard aging/receivables UI and `DashboardServiceTest.java` | Low |
| 5.3 SFR2 invoiced amounts | ✅ Complete | Monthly aggregations in `DashboardService.java`; chart in `Dashboard.tsx` | Low |
| 5.4 SFR3 revenue per flight | ✅ Complete | Revenue aggregation and dashboard chart; covered in dashboard tests/E2E declaration | Medium |
| 5.5 SOR1 contract expiry | ✅ Complete | Expiry aggregation in `DashboardService.java:211+`; dashboard table/widgets | Low |
| 5.6 Landing widgets | ✅ Complete | `Dashboard.tsx`; metrics produced by `DashboardService.java` | Low |
| 5.7 Report access control | ✅ Complete | `MIS_VIEWER` required at `DashboardService.java:243-245`; dimensional filters at lines 51-54 and 80-83 | Medium |

### Phase 6 – Airline Onboarding & Collaboration

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 6.1 Airline tenant setup | ⚠️ Partial | Tenant/user APIs and seven airline roles exist (`UserService.java:23-28`); no airline provisioning/admin UI | High |
| 6.2 Airline dashboard | ✅ Complete | `AirlineDashboard.tsx`; `App.tsx:31` | Low |
| 6.3 Airline contract viewer | ✅ Complete | `AirlineContracts.tsx`; tenant/read-only rules in `ContractService.java:110-129`; `AirlineContractViewerTest.java` | Low |
| 6.4 Review requests | ✅ Complete | V18; controller/service; supplier and airline pages; unit/controller/E2E tests | Low |
| 6.5 Airline invoice viewer | ✅ Complete | `AirlineInvoices.tsx`; visibility guard at `InvoiceService.java:103-117,471-478` | Low |
| 6.6 Airline payment status | ✅ Complete | Airline restriction and event publication at `InvoiceService.java:198-209,265-288` | Low |
| 6.7 Airline ABAC | ✅ Complete | Service-layer dimensional checks across invoice/contracts/reports; `DimensionalAccessTest.java` | Medium |
| 6.8 Notifications | ⚠️ Partial | Payment/review event classes and email listener exist; no durable delivery/retry record and no demonstrated new-invoice event | High |

### Phase 7 – RFP & Marketplace

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 7.1 Airline RFP creation | ✅ Complete | V19; `RfpService.java`; `AirlineRfps.tsx`; service/E2E tests | Low |
| 7.2 Supplier listing/response | ✅ Complete | V20; `SupplierRfpService.java`; `SupplierRfps.tsx`; tests | Low |
| 7.3 Airline evaluation | ⚠️ Partial | Accept/reject and draft contract seeding exist (`RfpEvaluationService.java:76-99,161-180`); controller has no method authorization | High |
| 7.4 Marketplace | ✅ Complete | V22; `ServiceMarketplaceService.java`; `Marketplace.tsx` / `ServiceOfferings.tsx`; tests | Low |
| 7.5 SOR3 supplier summary | ✅ Complete | `SupplierRfps.tsx`; supplier RFP service and E2E summary spec | Low |
| 7.6 AOR3 review summary | ✅ Complete | `AirlineReviewRequests.tsx`; `airline-review-request-summary.spec.ts` | Low |

### Phase 8 – Market Intelligence & Airline MIS

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 8.1 Airport cost index | ⚠️ Partial | Two-supplier suppression exists (`AirportCostIndexService.java:36,115`), but global unscoped invoice scan at line 79 violates INV-01 and E2E UI assertion fails | Critical |
| 8.2 Pricing benchmark | ⚠️ Partial | Quartile logic and two-supplier threshold (`PricingBenchmarkService.java:121,153-181`); also uses global unscoped scan at line 83 | Critical |
| 8.3 AFR1 billed amounts | ✅ Complete | `AirlineFinancialService.java`; `AirlineBilledAmountsPanel.tsx`; unit/E2E specs | Low |
| 8.4 AFR2 expected billing | ✅ Complete | `AirlineExpectedBillingService.java`; panel and tests | Medium |
| 8.5 AOR1 airline expiry | ✅ Complete | `AirlineContractExpiryService.java`; table/map panel and tests | Low |
| 8.6 AOR2 current footprint | ✅ Complete | `AirlineCurrentFootprintService.java`; map panel and tests | Low |
| 8.7 SOR2 supplier footprint | ✅ Complete | `SupplierOperationalFootprintService.java`; map panel and tests | Low |
| 8.8 SFR4 pending invoicing | ❌ Missing | No supplier pending-invoicing service/page/test found | High |

### Phase 9 – Dispute Management

| Item | Status | Evidence | Risk |
|---|---|---|---|
| 9.1 Airline initiation | ⚠️ Partial | Line-item/category/comment fields exist (`DisputeService.java:62-95`), but no airline/role enforcement and blank comments are accepted | Critical |
| 9.2 Supplier queue | ✅ Complete | Tenant query `DisputeRepository.java:30-34`; `DisputesList.tsx` filters/queue | Medium |
| 9.3 Response workflow | ⚠️ Partial | Message thread exists, but arbitrary actions and invalid/repeated transitions are accepted (`DisputeService.java:139-175`) | Critical |
| 9.4 Acceptance and credit note | ❌ Missing | Only numeric accumulation (`InvoiceService.java:330-349`); no credit-note record/XML/validation/storage/email | Critical |
| 9.5 Status/audit trail | ⚠️ Partial | Status enum/message rows exist; `UNDER_REVIEW` is never set by service logic and there is no immutable dispute audit event model | High |
| 9.6 Attachments | ❌ Missing | No multipart endpoint, metadata/table, content-type/size validation, or storage linkage found | Critical |
| 9.7 SDR1 supplier summary | ⚠️ Partial | UI derives cards/table client-side (`DisputesList.tsx:55-62,186+`); no chart or dedicated secured analytics API | Medium |
| 9.8 ADR1 airline summary | ⚠️ Partial | Same shared client-side view; no perspective-specific report implementation/tests | Medium |

## 3. Invariant Conformance Report

All 12 manifest paths exist. “Test passes” reflects the 2026-07-31 run with PostgreSQL running: **208 tests, 0 failures/errors**. Passing an incomplete test does not make the invariant conformant.

| Invariant | Registered | Exists | Test passes | Code enforcement | Finding | Evidence/assessment |
|---|---:|---:|---:|---:|---|---|
| INV-01 Tenant isolation | Yes | Yes | Yes | No | **Fail** | Registered test covers a few `InvoiceService` calls only (`TenantIsolationTest.java:60-113`); unscoped methods remain at `InvoiceRepository.java:21-22`, audit repositories, and `DisputeRepository.java:24`. |
| INV-02 Dimensional scope | Yes | Yes | Yes | Partial | **Fail** | Contract/invoice/report services generally enforce ABAC, but dispute detail/actions do not verify airport/airline/service dimensions (`DisputeService.java:34-45,139-175`). Manifest path patterns cover only report tests (`obligations.json:20-24`). |
| INV-03 Contract transitions | Yes | Yes | Yes | Yes | **Pass** | Strict state and role checks at `ContractService.java:156-190`; positive/negative lifecycle tests. |
| INV-04 Formula determinism | Yes | Yes | Yes | Yes | **Pass** | Seven evaluator tests plus negative/missing/type/tier checks (`PricingEngineTest.java:38-220`); central nonnegative parser. |
| INV-05 PF-07 fallback | Yes | Yes | Yes | Partial | **Needs investigation** | Unknown tail falls back correctly, but a missing tail always fails before an available aircraft-type default can be used (`MtowBasedEvaluator.java:34-42`). |
| INV-06 Cross-currency | Yes | Yes | Yes | Yes | **Pass** | Positive exchange rate and source enforced (`InvoiceService.java:423-434`) and tested. |
| INV-07 Invoice uniqueness | Yes | Yes | Yes | Yes | **Pass** | Service check at `InvoiceService.java:366-380`; DB unique index at `V17__invoice_currency_metadata_and_uniqueness.sql:3-4`. |
| INV-08 Invoice immutability | Yes | Yes | Yes | Partial | **Needs investigation** | Application update/delete guards exist, but registered tests exercise only `SENT`; no DB trigger/RLS prevents direct persistence changes to SENT/PAID/DISPUTED rows. Async job intentionally writes a SENT invoice (`DocumentGenerationJob.java:54-60`). |
| INV-09 IATA validation | Yes | Yes | Yes | No | **Fail** | Test validates against the local lean schema, not an official IATA schema; provenance metadata contradicts README. |
| INV-10 Dispute line item/status | Yes | Yes | Yes | Partial | **Needs investigation** | Guards exist in both services, but the registered test calls legacy `InvoiceService.disputeInvoice`, not the Phase 9 `DisputeService.createDispute` endpoint path. It does not test airline-only authorization or blank comments. |
| INV-11 Credit limit | Yes | Yes | Yes | Partial | **Needs investigation** | Application sum check exists (`InvoiceService.java:338-343`), but no DB constraint/locking protects concurrent acceptances and no real credit-note records exist. |
| INV-12 Closed vocabulary | Yes | Yes | Yes | No | **Fail** | The registered test verifies only 25 charge codes (`VocabularyEnforcementTest.java:41-91`). Most DB status/category columns are unchecked strings, and dispute `action` accepts arbitrary text (`DisputeService.java:149-171`). |

## 4. Development Contract Violations

1. **§2.1 / §7.2 – Ownership overlap.** `CODEOWNERS` assigns the migration directory to DB admins, then the broader `backend/` surface to developers, plus `*` fallback (`CODEOWNERS:14-29`). GitHub resolves the last matching pattern, so the broad later rule can defeat the claimed single owner for nested migration files.
2. **§3 – One-home integrity.** `backend/src/main/resources/schema/README.md:21-24` and `is-invoice.provenance.json:2-7` contain contradictory durable facts about whether the XSD is official.
3. **§4.1 – Invalid declared task paths.** `task-041-governance-remediation.md` declares 44 paths; 30 are missing, including `.github/scripts/validate_review_record.py`, `.github/scripts/validate_pr_approval.py`, `.github/reviews/.gitkeep`, and many task files (`task-041:10-16,25-50`). Other task files have the required fields and allowed proof values.
4. **§4.2 / §8 – Lifecycle/concurrency breach.** Eleven task files are simultaneously `REVIEW` (`tasks/task-041...task-051`, each line 5), exceeding the ceiling of three and retaining completed-looking durable status prose instead of closing/deleting tasks.
5. **§6.3-6.4 – Merge-tier/review mechanics incomplete.** `.github/workflows/ci.yml` has no job enforcing independent Tier 2 approval, Tech Lead Tier 3 approval, or PR review-record conditions.
6. **§7.1 – Dependency allowlist incomplete.** `spring-boot-starter-test` appears in `backend/pom.xml:110-114` but is absent from `dependency-allowlist.json`; the validator’s source comment treats it as exempt, contrary to the contract’s “all dependencies” rule.
7. **§7.3 – Path-claim locking cannot enforce current repository state reliably.** The repository already contains 11 active REVIEW tasks with overlapping paths; this conflicts with the intended dispatch lock regardless of branch-only validation.
8. **§7.4 – Contract protection is not mechanically demonstrated.** CODEOWNERS entries exist, but no branch-protection/ruleset artifact or API evidence was available.
9. **§7.5 – Obligation tripwire is incomplete.** All IDs and test files exist, but INV-03/05/06/07 have no `path_patterns`, INV-02 maps only report-test paths, and test substance is incomplete for INV-01/02/08/10/12 (`obligations.json:20-63`).
10. **§7.6 – Conformance trigger mismatch.** Explicit conformance runs based on declared proof (`ci.yml:103-107`), not a billing-path diff. The ordinary backend suite does run the test, but against a non-official schema.
11. **§7.9 – No topology reconciliation job.** CI never validates deployment configuration against `topology.json`.
12. **§9 – Missing milestone gates.** Only `phase-3-gate.json` and `governance-recovery-gate.json` exist; no Level 1 Core, Level 1 Complete, Level 2 Complete, or Level 3 Start gate exists. Named suite strings are not resolved to suite definitions. Coverage is 90%, but Maven measures only pricing code.
13. **Frontend test gate missing.** CI builds the frontend (`ci.yml:88-93`) but does not execute `npm test`; only two of 23 page components have unit-test files.
14. **Local validator portability gap.** The governance validators could not be executed in the audit host because neither `python` nor `py` was installed. CI installs Python, so this is a developer-environment reproducibility gap rather than proof that CI fails.

No release/v1 directories or explicit “50% done” source comments were found. Git history/PR metadata was not sufficient to establish whether an AI agent self-approved a PR or directly changed governance files; that item requires GitHub audit-log review.

## 5. Security & Multi-Tenancy Findings

- **Authentication:** `/api/**` is globally authenticated because only SPA routes/assets are `permitAll` and all other requests require authentication (`SecurityConfig.java:37-47`). Dev authentication is profile-limited to `dev`/`e2e` (`DevAuthFilter.java:19`). This baseline passes.
- **Authorization:** 16 of 20 controllers have no `@PreAuthorize`; some services perform strong checks, but authorization is inconsistent and missing on dispute/credit-note operations. Any authenticated ground-handler user can potentially exercise mutations for its accessible aggregate, independent of role.
- **Dispute party confusion:** `createDispute` never verifies tenant type, while setting sender type to airline. `respondToDispute` has no party-specific action matrix. This enables unauthorized initiation/resolution within a bilateral record.
- **Tenant filter:** There is no global Hibernate filter, `@Where`, DB RLS policy, or mandatory repository base class. Isolation depends on individual method naming and is demonstrably incomplete.
- **Market intelligence:** The two-supplier confidentiality threshold is correctly coded (`AirportCostIndexService.java:36,115`; `PricingBenchmarkService.java:40,121`), but the global raw-data fetch violates INV-01 and architecture §3.1.3 unless an explicitly approved anonymized aggregation boundary is added.
- **File uploads:** Phase 9 has no attachment endpoint at all, therefore no MIME allowlist, magic-byte inspection, size limit, malware scanning, object authorization, or tenant-scoped storage.
- **File storage:** Local keys are path-normalized (`LocalFileStorageService.java:40-45,61-65`), but files are not tenant-namespaced or encrypted/object-policy protected.

## 6. Data Model Integrity

- Core contract/invoice foreign keys exist, and V17 correctly scopes invoice-number uniqueness to `(tenant_id, airline_id, invoice_number)`.
- `disputes.airline_id` and `disputes.supplier_id` have no tenant foreign keys; `line_item_id` has no FK to `invoice_line_items` (`V26:5-8,20-26`).
- V26 uses `supplier_id` rather than the canonical `tenant_id` discriminator and has no tenant discriminator on dispute child tables.
- Status, category, tenant type, and formula columns are mostly free `VARCHAR` values without CHECK constraints; only selected fields such as billing frequency have closed-set DB checks (`V24:5-7`).
- No trigger/RLS policy enforces dispatched invoice immutability or credit-note totals at the DB boundary.
- Contract and invoice audit tables record user/action/time, but lack `tenant_id`; repository reads are by aggregate ID without tenant predicate.
- Phase 9 has message history, not a complete state-transition audit record. There is no credit-note table after V9 drops it.

## 7. Test Coverage and Quality Gaps

### Executed verification

| Command | Result |
|---|---|
| `mvn verify` with PostgreSQL 16 | **Pass:** 208 tests, 0 failures, 0 errors, 0 skipped; Flyway migrated through V26; configured 90% JaCoCo check passed for its limited 10-class pricing scope |
| `mvn clean test` without PostgreSQL | **Fail:** two PDF context errors; tests are not self-contained without declared external service |
| `npm test -- --run` (frontend) | **Pass:** 2 files / 17 tests |
| `npm run build` (frontend) | **Pass:** TypeScript and Vite; 1.53 MB JS chunk warning |
| `playwright test --list` | **Pass:** 32 tests in 23 files discovered |
| Full `playwright test` | **Fail/not complete:** exceeded 10 minutes and produced at least two failures |

Observed E2E failures:

1. `airport-cost-index.spec.ts:208` could not locate the newly created aircraft segment in the paginated UI, even though API assertions passed; the reused database contained 93 accumulated segments, making the test non-isolated.
2. `dispute-management.spec.ts:248` never received the “Dispute updated (ACCEPT)” success message. The test also stubs the dispute-list GET at lines 193-219 and conditionally accepts missing credit-note/XML proof at lines 255-270, so it cannot establish a real end-to-end credit-note flow even if green.

Specific coverage gaps:

- No credit-note XML conformance test exists.
- No test validates against a verified official IATA schema.
- INV-01 has no repository-wide query inspection/integration test or cross-tenant tests for RFPs, disputes, audit logs, documents, and market intelligence.
- INV-12 test covers charge codes only, not tenant types, all role sets, contract/invoice/dispute statuses, formula types, or dispute categories.
- INV-08 tests do not cover all immutable statuses and there is no persistence-layer test for direct changes.
- Formula tests cover all seven types, but edge coverage is uneven: the main suite does not apply zero/max/missing-driver cases independently to every PF-01–PF-07 evaluator.
- No dedicated Flyway migration test/testcontainer configuration exists; migration success currently depends on an externally started PostgreSQL.
- Controller-layer security tests cover only four controllers; most endpoint role matrices are untested.
- Frontend has tests for only `InvoiceWizard` and `DisputeDetailModal`; 21 other page components have no unit test file.
- There is no single E2E journey that proves login → contract → invoice → dispatch → dispute without API setup/stubbing/conditional assertions.

## 8. Phase Gate Readiness

| Gate | Readiness | Assessment |
|---|---|---|
| Level 1 Core (Phase 4) | 🔴 Not ready | XML is not verified official IATA IS-XML; dispatch failure is swallowed after `SENT`; local storage and async execution lack production durability/retries. |
| Level 1 Complete (Phase 5) | 🔴 Not ready | Dashboard functionality is substantial, but it inherits the Level 1 Core blockers and lacks the complete specified filter/test matrix. |
| Level 2 Complete (Phase 8) | 🔴 Not ready | Confidentiality threshold exists, but raw global scans violate INV-01, SFR4 is missing, and cost-index E2E fails with persistent test data. |
| Level 3 Start (Phase 9) | 🔴 Not ready | Party authorization/state transitions are unsafe; attachments and real credit-note XML/dispatch are missing; E2E acceptance fails. |

## 9. Recommended Remediation Backlog

| Priority | Issue | Impact | Suggested fix | Effort |
|---|---|---|---|---|
| Critical | Replace false IATA conformance | P4/P9, INV-09 | Acquire the licensed/official schema through an independently approved authority change; preserve verifiable provenance; generate the required official envelope/fields; validate invoice and credit-note samples before state changes. | XL |
| Critical | Enforce tenant isolation structurally | All, INV-01 | Introduce tenant-scoped repository interfaces/specifications plus integration tests and preferably PostgreSQL RLS; remove unrestricted aggregate queries or place market aggregation behind an approved anonymized service boundary. | XL |
| Critical | Secure dispute actions | P9, INV-02/10/12 | Require airline initiator roles, supplier responder/acceptor roles, dimensional checks, and an explicit party-aware transition table; reject arbitrary/repeated terminal actions. | L |
| Critical | Implement real credit notes | P9, INV-09/11 | Restore a tenant-scoped credit-note aggregate/table; transactional row locking/cumulative guard; official XML generation/validation; file storage, email dispatch, and audit events. | XL |
| Critical | Make dispatch state truthful | P4, INV-08/09 | Add queued/generating/failed/delivered states or an outbox/job table; mark `SENT` only after validated documents and successful dispatch; retry idempotently and surface failures. | L |
| Critical | Implement safe dispute attachments | P9 | Multipart API with size/MIME/magic-byte controls, malware scan, tenant/object authorization, encrypted object storage, metadata and retention policy. | L |
| High | Fix invoice contract-period validation | P3 | Validate every `InvoiceLineItem.flightDate` against the referenced approved contract period; test boundary dates and mixed-validity invoices. | M |
| High | Complete DB integrity controls | P3/P9, INV-08/11/12 | Add dispute tenant FKs/line-item FK, status/category CHECKs, credit total constraint/locking, and DB immutability/RLS policy. | L |
| High | Repair E2E isolation/reliability | P4/P8/P9 | Reset or namespace test data per run, avoid persistent pagination pollution, remove route stubs and conditional assertions, and split suites while retaining a true full journey. | M |
| High | Complete governance enforcement | Process | Add repository ruleset documentation/verification, approval-tier jobs, billing-path conformance trigger, topology reconciliation, and path-lock validation against all active work. | L |
| High | Reconcile work units | Process | Close/delete completed tasks, reduce active units to ≤3, repair/remove the 30 stale paths in TASK-041, and resolve overlaps. | S |
| High | Complete obligation mappings/tests | All invariants | Add path patterns to every obligation and broaden tests for repositories, all immutable statuses, actual Phase 9 endpoints, and all vocabularies. | L |
| High | Implement SFR4 pending invoicing | P8 | Add supplier-scoped service/API/page based on approved contract frequency, dimensional filters, currency separation, unit and E2E tests. | M |
| Medium | Correct PF-07 aircraft-type fallback | P2/P3, INV-05 | Permit an aircraft-type default when tail is absent if that is the canonical rule; otherwise amend the contract through authority review. Add aircraft-type-only test. | S |
| Medium | Complete supplier/airline admin UI | P1/P6 | Build tenant/user/role/dimensional restriction and supplier-configuration pages with secured APIs and tests. | L |
| Medium | Expand frontend unit coverage | P1–P9 | Cover role visibility, filters, errors, loading, dispatch, market thresholds, RFP decisions, and dispute state actions; run Vitest in CI. | L |
| Medium | Make integration tests self-contained | Process | Use Testcontainers or a dedicated test datasource/profile; ensure `mvn test` either provisions or clearly requires PostgreSQL. | M |
| Medium | Fix dependency/CODEOWNERS mechanics | Process | Allowlist `spring-boot-starter-test` explicitly; reorder/narrow CODEOWNERS patterns and verify effective ownership with branch rules. | S |
| Low | Reduce frontend bundle | P1–P9 | Route-level code splitting/manual chunks; establish performance budget in CI. | M |

## 10. Audit Limitations

- GitHub-hosted branch protection, PR review records, actor identities, and audit logs were not available locally; claims about self-approval cannot be verified from source alone.
- Email delivery was tested through mocks/configuration, not an external production provider.
- The full Playwright process was terminated by the 10-minute audit timeout after producing failure artifacts; absence of additional reported failures is not evidence of pass.
- The repository’s `gh-clearing-db` Docker Compose service was started for verification and stopped afterward; its named test-data volume was left intact.
