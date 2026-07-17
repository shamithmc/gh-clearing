# Implementation Phases

# Airline Ground Handling Cost Management Platform

Each phase delivers a **working, deployable product** that builds on the previous phase.

---

## Phase 1 — Foundation & Onboarding

> **Goal:** Platform infrastructure + supplier/airline master data setup. A running application with authentication, tenant management, and reference data.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 1.1 | **Project Scaffolding** | Spring Boot 3.x project, module structure, CI/CD pipeline, dev/staging/prod environments |
| 1.2 | **Database Setup** | PostgreSQL with multi-tenant schema (discriminator-based), Flyway migrations |
| 1.3 | **Authentication & Identity** | Keycloak integration, OAuth2/OIDC login, user registration |
| 1.4 | **Tenant Management** | Platform admin can create ground handler and airline tenants |
| 1.5 | **User & Role Management** | Admin assigns roles to users within a tenant (all ground handler roles defined, dimensional restrictions stored but not enforced yet) |
| 1.6 | **Reference Data — IATA Charge Codes** | Seed all 25 charge codes as system reference data |
| 1.7 | **Reference Data — Airlines** | Airline master (IATA 2-letter code, name, country) |
| 1.8 | **Reference Data — Airports** | Airport master (IATA 3-letter code, name, city, country, region) |
| 1.9 | **Supplier Configuration** | Enable airlines and airports per supplier; configure email IDs, invoice backdating rules, regional classifications |
| 1.10 | **Landing Page** | Ground handler landing page / dashboard shell (placeholder widgets) |

### Tech Stack Established

- Java 21 + Spring Boot 3.x + Spring Security
- PostgreSQL + Flyway
- Keycloak (auth)
- React + TypeScript + Ant Design (frontend shell)
- Docker + CI/CD pipeline
- Redis (session store)
- S3/Blob storage bucket (ready for later use)

### What You Can Do After Phase 1

- Log in as a platform admin, ground handler admin, or airline user
- Create tenants, users, assign roles
- Configure supplier settings (enabled airlines, airports, email IDs)
- Browse reference data (airlines, airports, charge codes)

---

## Phase 2 — Contract Management

> **Goal:** Ground handlers can create, submit, review, and approve service contracts. The core business data model is established.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 2.1 | **Contract Data Model** | Contract entity with all fields: airline, airport, service type, charge code mapping, currency, period, formula type, rates, quantity drivers, UoM |
| 2.2 | **Pricing Formula Engine** | Support all 7 formula types (PF-01 through PF-07). Formula configuration stored as structured JSON. Calculation engine that computes cost given formula + inputs |
| 2.3 | **Contract Entry UI** | Multi-step wizard: select airline/airport → pick service type & charge code → select formula type → dynamic form renders based on formula → enter rates, quantity drivers, UoM → tax codes → review summary → submit |
| 2.4 | **Contract Listing & Filters** | Contracts landing page grouped by airline/airport. Filters: awaiting approval, approved, expired |
| 2.5 | **Contract Approval Workflow** | Approver views contract summary → Approve or Mark for Review (with comments). Status transitions: Draft → Submitted → Approved / Review Requested → Resubmitted → Approved |
| 2.6 | **ABAC Enforcement** | Dimensional access control enforced — users see/act on contracts only within their permitted airports, airlines, service types |
| 2.7 | **Audit Trail** | All contract actions logged (created, submitted, approved, review requested) with user and timestamp |
| 2.8 | **MTOW Reference Data** | Basic MTOW table (aircraft type + tail ID → weight). Manual entry for now; self-updating mechanism deferred |

### What You Can Do After Phase 2

- Full contract lifecycle: create → submit → review → approve
- All 7 pricing formula types supported
- Contracts are access-controlled by role and dimensions
- Approved contracts are ready to be referenced during invoicing

---

## Phase 3 — Invoice Creation & Calculation

> **Goal:** Ground handlers can create invoices against approved contracts, enter flight-level operational data, and the system auto-calculates charges.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 3.1 | **Invoice Data Model** | Invoice header (date, number, currency, exchange rate, due date, period, totals) + line items (flight details + quantity drivers + calculated cost per service) |
| 3.2 | **Invoice Entry UI** | Select airline & airport → pick service(s) from approved contracts → enter header fields → per-service flight line entry (date, flight #, aircraft reg, dep, dest, quantity drivers) → auto-calculate line cost → save & validate → summary → finalize |
| 3.3 | **Auto-Calculation** | On entering quantity drivers, system applies the contract's pricing formula and populates the calculated cost. Header total auto-sums from lines |
| 3.4 | **Cross-Currency Handling** | If invoice currency differs from contract currency, exchange rate field becomes mandatory. Line costs converted accordingly |
| 3.5 | **Invoice Validation** | Validate: unique invoice number per airline-supplier pair, mandatory fields, line totals match header, contract is active for the invoice period |
| 3.6 | **Invoice Listing** | List invoices with filters: draft, finalized, approved, sent, paid, disputed. Grouped by airline/airport |
| 3.7 | **Invoice Edit & Lock** | Editable until sent. Once sent → locked (read-only) |
| 3.8 | **Audit Trail** | All invoice actions logged |

### What You Can Do After Phase 3

- Create invoices against approved contracts
- Enter flight-level data, system auto-calculates charges using contract formulas
- Full invoice lifecycle up to finalization
- Invoices are validated and access-controlled

---

## Phase 4 — Invoice Approval, XML/PDF Generation & Dispatch

> **Goal:** Invoice approval workflow, IATA IS-XML and PDF generation, email dispatch to airlines. **This is the Level 1 MVP go-live.**

### Deliverables

| # | Feature | Details |
|---|---|---|
| 4.1 | **Invoice Approval Workflow** | Approver reviews → Mark for Modification (with comments) / Approve. Status: Finalized → Approved / Modification Requested → Re-finalized → Approved |
| 4.2 | **IATA IS-XML Generation** | JAXB-based XML generation from invoice data. Compliant with IATA IS-XML e-invoicing standard for ground handlers. Maps services to charge codes in XML output |
| 4.3 | **PDF Invoice Generation** | HTML template → PDF rendering (Thymeleaf + OpenPDF or Puppeteer). Professional invoice layout |
| 4.4 | **Invoice Dispatch** | Send approved invoice via email (IS-XML attachment + PDF) to airline-configured email addresses. Spring Integration + SES/SendGrid |
| 4.5 | **Payment Status Tracking** | Manual tick-box: mark sent invoice as Paid. Payment date recorded |
| 4.6 | **Invoice Status — Disputed** | Simple dispute marking with comments (lightweight, pre-Level 3). No workflow yet |
| 4.7 | **File Storage** | Generated XML and PDF files stored in S3/Blob. Downloadable from invoice detail page |
| 4.8 | **Background Processing** | XML/PDF generation and email dispatch run as async jobs (BullMQ / Spring Batch). Status shown to user |

### What You Can Do After Phase 4

**This is Level 1 — fully functional for ground handlers:**
- Complete contract-to-invoice-to-dispatch workflow
- Generate and send IATA IS-XML invoices to airlines
- Track payment status
- Download generated XML/PDF files

---

## Phase 5 — Supplier MIS & Dashboards

> **Goal:** Supplier-facing analytics — receivables, invoiced amounts, revenue per flight, contract expiry tracking.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 5.1 | **Dashboard Framework** | Reusable dashboard layout with dimension filters (airline, airport, service type, currency, aircraft type, date range) |
| 5.2 | **SFR1 — Receivables Summary** | Outstanding receivables by airline/airport. Pie charts. Aging analysis (sysdate − invoice date). Drill-down to invoice list |
| 5.3 | **SFR2 — Invoiced Amounts** | Monthly invoiced amount trends. Bar graph with dimension filters. Drill-down to invoices |
| 5.4 | **SFR3 — Revenue per Flight** | Revenue per invoiced flight by airline/airport/service. Line graph |
| 5.5 | **SOR1 — Contracts Expiry** | Table of contracts approaching expiry (airline, airport, service type, days remaining). Sortable and filterable |
| 5.6 | **Landing Page Widgets** | Dashboard shell from Phase 1 now populated with summary widgets (total receivables, invoices this month, contracts expiring soon) |
| 5.7 | **Report Access Control** | MIS Viewer role enforced. Reports filtered by user's dimensional access |

### What You Can Do After Phase 5

**Level 1 is now complete with analytics:**
- Ground handler has full operational visibility
- Receivables tracking with aging
- Revenue and invoicing trends
- Contract expiry alerts
- All reports are dimensionally access-controlled

---

## Phase 6 — Airline Onboarding & Contract Collaboration

> **Goal:** Airlines join the platform. They can view contracts, mark invoices as paid, and raise contract review requests. Beginning of Level 2.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 6.1 | **Airline Tenant Setup** | Airline-side tenant provisioning, user creation, role assignment (all 7 airline roles) |
| 6.2 | **Airline Dashboard Shell** | Airline-specific landing page with navigation to their features |
| 6.3 | **Contract Viewer (Airline)** | Airlines view contracts that their ground handlers have with them. Read-only. Filtered by airport, service type |
| 6.4 | **Contract Review Request** | Airlines raise review requests on contracts with comments. Ground handlers see these under a "Review Requests" queue |
| 6.5 | **Invoice Viewer (Airline)** | Airlines view invoices sent to them. Download XML/PDF. Filter by airport, service type, status |
| 6.6 | **Payment Status (Airline)** | Airlines mark invoices as paid from their side. Reflects on supplier's view |
| 6.7 | **ABAC for Airline Roles** | Dimensional access control enforced for airline users (airport, service type) |
| 6.8 | **Notifications** | Email notifications for key events: new invoice received, contract review requested, payment marked |

### What You Can Do After Phase 6

- Airlines log in and see their contracts and invoices
- Airlines mark invoices as paid (visible to suppliers)
- Airlines request contract reviews
- Two-way visibility between supplier and airline established

---

## Phase 7 — RFP & Service Provider Marketplace

> **Goal:** Airlines issue RFPs for services at airports. Ground handlers respond. Service provider marketplace goes live.

### Deliverables

| # | Feature | Details |
|---|---|---|
| 7.1 | **RFP Creation (Airline)** | Airline creates RFP: select airport, service type, requirements, desired contract period. Published to eligible ground handlers |
| 7.2 | **RFP Listing & Response (Supplier)** | Ground handlers see RFPs for airports they operate in. Submit proposals with rates and terms |
| 7.3 | **RFP Evaluation (Airline)** | Airline reviews proposals, compares, accepts/rejects. Accepted proposal can seed a new contract |
| 7.4 | **Service Provider Marketplace** | Suppliers list their service offerings per airport. Airlines browse available services by airport/region. Gateway to RFP initiation |
| 7.5 | **SOR3 — RFP Summary (Supplier)** | Table of received RFPs, response status, outcome |
| 7.6 | **AOR3 — Review Requests (Airline)** | Table of contract review requests sent and their status |

### What You Can Do After Phase 7

- Airlines discover ground handlers at any airport
- Structured RFP process replaces ad-hoc procurement
- Suppliers gain a new channel for business development

---

## Phase 8 — Market Intelligence & Airline MIS

> **Goal:** Airport cost indices, pricing benchmarks, and airline-specific dashboards. **Level 2 is now complete.**

### Deliverables

| # | Feature | Details |
|---|---|---|
| 8.1 | **Airport Cost Index** | Aggregated cost per service type per airport/region. Dimensions: aircraft type, international/domestic. Only shown when 2+ suppliers exist at an airport. Confidentiality-safe |
| 8.2 | **Pricing Benchmark** | Airlines see if their rates are top-25% / mid-50% / bottom-25% relative to market. Dimensioned by aircraft type |
| 8.3 | **AFR1 — Billed Amounts (Airline)** | Amounts billed by suppliers. Pie chart, bar graph. Airport-wise, service-wise. Drill-down to invoices |
| 8.4 | **AFR2 — Expected Billing (Airline)** | Projected billing based on contract frequency. Line graph |
| 8.5 | **AOR1 — Contracts Expiry (Airline)** | Table + map view of contracts approaching expiry |
| 8.6 | **AOR2 — Current Footprint (Airline)** | Map visualization. Airports with services and suppliers. Mouseover shows monthly rates and invoiced values |
| 8.7 | **SOR2 — Operational Footprint (Supplier)** | Map of supplier's geographic operations with airline/service type dropdowns |
| 8.8 | **SFR4 — Pending Invoicing (Supplier)** | Amounts waiting to be invoiced based on billing frequency and contracts |

### What You Can Do After Phase 8

**Level 2 is complete:**
- Airlines have full financial and operational dashboards
- Market intelligence helps airlines benchmark costs and discover providers
- Suppliers see their operational footprint and pending invoicing amounts
- Two-sided platform is fully operational

---

## Phase 9 — Dispute Management

> **Goal:** Structured dispute workflow between airlines and ground handlers with credit note generation. **Level 3 begins.**

### Deliverables

| # | Feature | Details |
|---|---|---|
| 9.1 | **Dispute Initiation (Airline)** | Airline marks invoice line items as disputed. Selects reason category (5 types), adds comments and file attachments |
| 9.2 | **Dispute Queue (Supplier)** | Ground handler sees incoming disputes. Filters by airline, airport, dispute type, status |
| 9.3 | **Dispute Response Workflow** | Back-and-forth exchange: supplier responds with justification + attachments → airline accepts or pushes back → cycle continues until resolution |
| 9.4 | **Dispute Acceptance & Credit Note** | On supplier acceptance of a dispute, system auto-generates a credit note (IATA IS-XML format). Credit note offsets the disputed amount. Sent to airline via email |
| 9.5 | **Dispute Status Tracking** | Full status lifecycle: Open → Under Review → Responded → Accepted / Rejected / Escalated. Audit trail on all actions |
| 9.6 | **File Attachments** | Upload supporting documents to disputes (stored in S3/Blob). Both parties can attach files at each step |
| 9.7 | **SDR1 — Dispute Summary (Supplier)** | Pie chart by dispute value, table view. Dimensions: dispute type, airline, airport |
| 9.8 | **ADR1 — Dispute Summary (Airline)** | Same from airline perspective |

### What You Can Do After Phase 9

- Full dispute lifecycle with audit trail
- Credit notes auto-generated in IATA XML on dispute acceptance
- Both parties have dispute analytics dashboards

---

## Phase 10 — GDS Integration & Advanced Features

> **Goal:** GDS flight data integration, exchange rate feeds, and platform hardening. **Level 3 complete.**

### Deliverables

| # | Feature | Details |
|---|---|---|
| 10.1 | **GDS Integration** | Connect to GDS provider. On invoice entry, entering date range + airline auto-populates flight details (flight #, aircraft reg, dep, dest). User can override |
| 10.2 | **Exchange Rate Feed** | Bloomberg/Reuters feed integration. Auto-populate exchange rates for cross-currency invoices. Manual override available |
| 10.3 | **MTOW Auto-Update** | Automated feed for tail number registry with reference industry weights and actual MTOW values |
| 10.4 | **Payment Terms Logic** | Auto-calculate invoice due dates based on configurable payment terms per airline-supplier pair |
| 10.5 | **Advanced Notifications** | In-app notification center + email digests. Contract expiry reminders, dispute escalation alerts, RFP deadlines |
| 10.6 | **Platform Hardening** | Performance optimization for large data volumes, report caching (Redis), database query tuning, load testing |
| 10.7 | **ICH Readiness** | Assess and prepare for IATA Clearing House submission pathway. May require additional XML formats and submission protocols |

### What You Can Do After Phase 10

**Full platform at Level 3:**
- Flight data auto-populated from GDS — minimal manual entry
- Exchange rates automated
- Payment terms auto-calculated
- Platform is production-hardened for scale

---

## Phase Summary

| Phase | Name | Cumulative Capability | Business Level |
|---|---|---|---|
| **1** | Foundation & Onboarding | Auth, tenants, roles, reference data | — |
| **2** | Contract Management | Full contract lifecycle with all formula types | — |
| **3** | Invoice Creation | Invoices with auto-calculation against contracts | — |
| **4** | XML/PDF & Dispatch | IATA XML generation, email dispatch, payment tracking | **Level 1 Core** |
| **5** | Supplier MIS | Receivables, trends, contract expiry dashboards | **Level 1 Complete** |
| **6** | Airline Onboarding | Airlines view contracts/invoices, mark paid, request reviews | Level 2 Start |
| **7** | RFP & Marketplace | RFP workflow, service provider discovery | Level 2 |
| **8** | Market Intelligence & Airline MIS | Cost indices, benchmarks, airline dashboards | **Level 2 Complete** |
| **9** | Dispute Management | Full dispute workflow, credit notes in XML | Level 3 Start |
| **10** | GDS & Advanced | GDS integration, exchange rates, platform hardening | **Level 3 Complete** |

---

## Dependency Map

```
Phase 1 (Foundation)
  └── Phase 2 (Contracts)
        └── Phase 3 (Invoice Creation)
              └── Phase 4 (XML/PDF & Dispatch)  ← Level 1 MVP
                    ├── Phase 5 (Supplier MIS)   ← Level 1 Complete
                    └── Phase 6 (Airline Onboarding)
                          ├── Phase 7 (RFP & Marketplace)
                          │     └── Phase 8 (Market Intel & Airline MIS) ← Level 2 Complete
                          └── Phase 9 (Dispute Management)
                                └── Phase 10 (GDS & Advanced) ← Level 3 Complete
```

> **Note:** Phases 5 and 6 can run in parallel after Phase 4. Phases 7 and 9 can also run in parallel after Phase 6 if teams are available.
