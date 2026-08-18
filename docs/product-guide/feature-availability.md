# Feature Availability

This document defines current product capabilities, delivered baseline features,
and planned future capabilities to ensure clarity on operational status.

The baseline reflects all functionality completed and audited through **Phase 10**:

| Capability | Phase | Status | Notes & Specifications |
|---|---|---|---|
| **Multi-Tenant Foundation & AuthKit** | Phase 1 | **Available** | Multi-tenant PostgreSQL isolation, WorkOS AuthKit OIDC authentication, user session management, simulated auth personas. |
| **Platform Administration & ABAC Management** | Phase 10 | **Available** | Platform Admin tenant management (`/admin/tenants`), organization editing and status toggles, user provisioning with multi-dimensional ABAC restrictions (`/admin/users`). |
| **IATA Charge Codes & Reference Master** | Phase 1 | **Available** | 25 standard IATA charge codes, airline and airport master registries with geographic coordinates. |
| **Supplier Configuration** | Phase 1/10 | **Available** | Secured supplier configuration (`/supplier/configuration`) with enabled airlines, airports, email endpoints, backdating rules, and regional classifications. |
| **Contract Lifecycle & Approval** | Phase 2 | **Available** | Full lifecycle (`DRAFT` → `SUBMITTED` → `APPROVED` / `REVIEW_REQUESTED`), dimensional ABAC enforcement, audit logging. |
| **Dynamic Formula Authoring UI (PF-01 to PF-07)** | Phase 2/10 | **Available** | Dedicated interactive formula sub-editors (Unit Rate, Compound Drivers, Volume Tiers, Slabs, Time-Bands, 7-Day Grid, MTOW weight-based) with monotonicity validation and Formula Review Cards in Step 3. |
| **Contract Editing & Revision Cycles** | Phase 10 | **Available** | Full editing support on `/contracts/:id/edit` for `DRAFT` and `REVIEW_REQUESTED` contracts with formula preloading and revision approval cycles. |
| **Invoice Creation & Auto-Calculation** | Phase 3 | **Available** | Flight line item entry, auto-calculation against active contract formulas, cross-currency exchange rate handling, flight-date contract period validation. |
| **Invoice Editing & Modification Cycles** | Phase 10 | **Available** | Full edit mode on `/invoices/:id/edit` for `DRAFT` and `MODIFICATION_REQUESTED` invoices, flight line updates, and quantity driver preservation. |
| **Invoice Approval & Dispatch** | Phase 4 | **Available** | Finalize → Approve → Send workflow, modification requests with feedback, asynchronous job queue with durable dispatch state, locked dispatched invoices. |
| **IATA IS-XML & PDF Generation** | Phase 4 | **Available** | JAXB XML generator validated against application-contract schema (`is-invoice.xsd`), PDF invoice generation, download actions. |
| **Payment Status Tracking** | Phase 4/6 | **Available** | Shared `SENT` / `DISPUTED` → `PAID` toggle with timestamp and audit logging for both supplier and airline personas. |
| **Supplier Dashboard & Analytics (SFR1–SFR3, SOR1)** | Phase 5 | **Available** | Receivables summary and aging buckets, monthly invoiced trends, revenue per flight, 90-day expiring contracts table. |
| **Airline Contract & Invoice Viewer** | Phase 6 | **Available** | Read-only access to non-draft contracts and dispatched invoices in tenant/dimensional scope; XML & PDF download. |
| **Airline Contract Review Requests (AOR3)** | Phase 6/7 | **Available** | Airlines submit review requests with mandatory comments; ground handlers process via dedicated review queue with edit wizard revision. |
| **Workflow Email Notifications** | Phase 4/6 | **Available** | Dispatched invoice notifications, contract review requests, payment status updates. |
| **Service Offerings & Marketplace** | Phase 7/10 | **Available** | Ground handlers publish and edit airport service offerings; airlines browse and filter offerings by region, station, and service. |
| **Airline RFP Creation & Editing** | Phase 7/10 | **Available** | Airlines publish and edit RFPs with requirements and target validity; automatic routing to configured operating suppliers. |
| **Supplier RFP Proposals & Bid Revisions (SOR3)** | Phase 7/10 | **Available** | Suppliers submit and revise structured commercial proposals; track proposal status (`SUBMITTED`, `ACCEPTED`, `REJECTED`) and RFP outcome. |
| **RFP Evaluation & Contract Award** | Phase 7 | **Available** | Airline proposal comparison, rejection, or acceptance; awarding an RFP automatically generates a traceable draft contract for the supplier. |
| **Airport Cost Index** | Phase 8 | **Available** | Aggregated average handling costs by airport, region, service, aircraft type, and operation type (International vs. Domestic). Confidentiality barrier enforces minimum 2 suppliers. |
| **Pricing Benchmark** | Phase 8 | **Available** | Rate comparison against market quartiles (Top 25% Premium, Mid 50% Standard, Bottom 25% Competitive). |
| **Airline Financial & Operational MIS (AFR1, AFR2, AOR1, AOR2)** | Phase 8 | **Available** | Billed Amounts (AFR1), Expected Billing projections (AFR2), Contract Expiry timeline (AOR1), Geographic Current Footprint (AOR2). |
| **Supplier Operational Footprint & Pending Invoicing (SOR2, SFR4)** | Phase 8 | **Available** | Geographic Operational Footprint (SOR2), Pending Invoicing of uninvoiced due flight services by currency, airline, and station (SFR4). |
| **Dispute Initiation & Line-Item Marking** | Phase 9 | **Available** | Airlines flag invoice line items with reason category and comments; invoice updates to `DISPUTED`. |
| **Dispute Management Queue & Thread (SDR1, ADR1)** | Phase 9 | **Available** | Real-time dispute queue, metric cards, tabbed views (`ALL`, `OPEN`, `RESPONDED`, `RESOLVED`), role-authorized party actions. |
| **Secure Evidence Attachments** | Phase 9 | **Available** | Multi-party document uploads (PDF, images, CSV, XML) up to 10MB, ClamAV antivirus scanning, MIME validation, tenant-isolated storage. |
| **Automated IATA IS-XML Credit Notes** | Phase 9 | **Available** | Supplier acceptance auto-generates credit notes in application-contract IS-XML format (`is-credit-note.xsd`), offsets invoice amounts, and records audit trail. |
| **GDS Flight Data Integration** | Phase 10 | Planned | Auto-population of flight numbers, registrations, and origins/destinations from GDS feed. |
| **Automated Exchange Rate Feed** | Phase 10 | Planned | Live foreign exchange rate feed (Bloomberg/Reuters/ECB) with manual override. |
| **Automated MTOW Registry Feed** | Phase 10 | Planned | Live aircraft tail registry feed for reference and actual MTOW updates. |
| **Advanced In-App Notification Center** | Phase 10 | Planned | In-app notification center with durable retry tracking, SLA escalation alerts, and digest delivery. |
| **Official IATA/ICH Conformance Certification** | Phase 10 | Planned | Official IATA IS-XML licensing provenance and external ICH clearing house submission protocols (Phase 10.7 Gate). |
