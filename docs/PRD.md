# Product Requirements Document (PRD)

# Airline Ground Handling Cost Management Platform

---

## 1. Overview

### 1.1 Product Vision

A SaaS platform enabling airline ground handling service providers to invoice airlines in IATA-standard IS-XML formats, evolving into a two-sided marketplace offering market intelligence, contract management, and dispute resolution for the airline ground handling industry.

### 1.2 Problem Statement

- Most ground handling providers are small/regional and lack sophisticated invoicing systems. They invoice airlines via PDF or paper instead of IATA XML.
- Airlines spend significant time and cost converting PDF invoices into electronic formats and verifying them, causing delayed payments to ground handlers.
- Ground handlers lack analytics on their cost base — pricing benchmarks, market share, and revenue breakdowns are unavailable.
- Airlines struggle to estimate ground handling costs at new airports and have no structured way to compare pricing.
- Disputes between airlines and ground handlers are managed over email/phone with no audit trail.

### 1.3 Value Proposition

| Stakeholder | Value |
|---|---|
| **Ground Handlers** | IATA XML-compliant invoicing, faster payments, improved cash flow, eligibility for IATA Clearing House (ICH), analytics on revenue and receivables |
| **Airlines** | Reduced invoice processing cost (straight-through processing), market intelligence on airport handling costs, structured dispute management |

---

## 2. Product Levels & Phased Rollout

### Level 1 — Supplier-Driven Invoicing (MVP / Go-Live)

The platform is driven entirely by the ground handler. Core capabilities:

- **Contract Management** — Enter, maintain, review, and approve service contracts
- **Invoice Creation** — Enter operational/flight data, auto-calculate charges per contract, generate invoices
- **Invoice Delivery** — Send invoices to airlines in IATA IS-XML or PDF format
- **Payment Tracking** — Mark invoices as settled (manual tick-box)
- **Supplier MIS** — Receivables summary, invoiced amounts, revenue per flight

**Key Risks:**
- Starting from zero user base
- Convincing small ground handlers to adopt the platform
- Product-market fit validation with pilot users

### Level 2 — Two-Sided Platform (Airline Participation)

Airlines actively participate on the platform:

- **Contract Review & Approval** — Airlines review and approve contracts
- **Request for Proposal (RFP)** — Airlines issue RFPs for services at specific airports
- **Payment Status** — Airlines mark invoices as paid
- **Market Intelligence** — Airport cost indices, service provider marketplace, pricing benchmarks
- **Enhanced MIS** — Airline-specific financial and operational dashboards

**Key Risks:**
- Requires critical mass of ground handlers before airlines will engage
- Airlines are large, slow-moving organizations resistant to process change

### Level 3 — Dispute Management

Everything in Level 2, plus:

- **Dispute Workflow** — Airlines flag incorrect charges with reasons, comments, and attachments
- **Back-and-Forth Resolution** — Structured dispute exchange between airline and ground handler
- **Credit Notes** — Auto-generated credit notes on dispute acceptance (IATA XML format)
- **Dispute Analytics** — Summary dashboards by dispute type

**Key Risks:**
- Requires close coordination between airlines and ground handlers
- Critical mass of supplier-airline pairs must already be at Level 2
- GDS integration becomes mandatory at this level

---

## 3. Functional Requirements

### 3.1 Contract Management

#### FR-CM-01: Contract Creation

| Field | Details |
|---|---|
| Airline | Selected from enabled airlines (platform-controlled enablement) |
| Airport | Selected from enabled airports (platform-controlled enablement) |
| Service Type | Mapped to one of the IATA charge codes (see Section 5) |
| Billing Frequency | Optional |
| Contract Period | From date — To date |
| Service Name | Supplier-specific name (free text) |
| Currency | Contract currency |
| Formula Type | One of the supported pricing formulas (see Section 3.2) |
| Rate / Formula Details | Rendered dynamically based on formula type |
| Quantity Driver | User-defined (e.g., wheelchairs, check-in counters, de-icing fluid) |
| Unit of Measure | Applicable UoM for the quantity driver |
| Tax Codes / Rates | Tax rules applicable (requires IATA XML study) |

**Workflow:** Save → Review Summary (popup) → Submit → Pending Approval

#### FR-CM-02: Contract Approval

- View contracts filtered by: awaiting approval, approved, expired
- Filter/group by airport and airline
- View contract summary popup with approve action
- "Mark for Review" action with comments — returns contract to the entry person
- On approval, contract is finalized and available for invoicing

#### FR-CM-03: Contract Review Request (Level 2+)

- Airlines can raise review requests on existing contracts
- Visible to ground handlers under RFP monitoring

### 3.2 Pricing Formulas

The platform must support the following contract pricing models:

| ID | Type | Description | Example |
|---|---|---|---|
| PF-01 | **Unit Rate** | Rate × Quantity | $10 × 5 baggage containers = $50 |
| PF-02 | **Unit Rate (Compound)** | Rate × Qty1 × Qty2 | $5 × 3 counters × 4 hours = $60 |
| PF-03 | **Slab-Based (Incremental)** | Tiered pricing per quantity band | 1–3 wheelchairs: $3 each; 4–5: $5 each |
| PF-04 | **Slab-Based (All-Units)** | Entire quantity repriced at slab rate when threshold crossed | 4th wheelchair triggers full qty × slab rate |
| PF-05 | **Time-Based** | Rate varies by time-of-day | Before 5 PM: $100/hr; 5–10 PM: $150/hr |
| PF-06 | **Day/Period-Based** | Rate varies by day/period | Weekend aerobridge rate > weekday rate |
| PF-07 | **MTOW-Based** | Rate based on Maximum Takeoff Weight of aircraft | Rates vary by aircraft tail ID; requires MTOW reference data |

**Note on PF-07:** MTOW is airline- and aircraft-specific (e.g., A380 MTOW differs between Singapore Airlines and Etihad). The platform may need to maintain a self-updating registry of tail numbers, reference industry weights, and actual MTOW values.

### 3.3 Invoice Management

#### FR-INV-01: Invoice Creation

**Header Fields:**

| Field | Details |
|---|---|
| Airline & Airport | Selected at creation |
| Service(s) | Multi-select; each service linked to an approved contract |
| Invoice Date | System date preferred; supplier-specific parameter controls backdating rules |
| Invoice Number | User-entered, alphanumeric, unique per airline-ground handler pair |
| Invoice Currency | Defaults to contract currency; if different, exchange rate field becomes mandatory |
| Invoice Header Total | Auto-calculated from line items |
| Invoice Due Date | Manual entry (payment terms logic deferred) |
| Invoice Period | From date — To date (flight date range) |

**Line Item Fields (per service, per flight):**

| Field | Details |
|---|---|
| Date | Flight date |
| Flight Number | Airline flight number |
| Aircraft Registration | Tail ID |
| Departure | Departure airport |
| Destination | Destination airport |
| Quantity Drivers | As defined in the contract (e.g., number of wheelchairs, hours) |
| Calculated Cost | Auto-calculated based on contract formula |

**Workflow:** Enter data → Save (validates & shows summary) → Finalize (submits for approval)

- Invoice is editable until it is sent to the airline
- Once sent, invoice is locked (no edits)

#### FR-INV-02: Invoice Approval & Dispatch

- Approver can: review invoice, mark for modification (with comments), approve, or send
- Send to airline-configured email addresses (part of supplier setup)
- Mark sent invoice as Paid
- Mark sent invoice as Disputed (with comments) — Level 3 provides a richer workflow

#### FR-INV-03: Invoice Output Formats

- **IATA IS-XML** — Primary format; compliant with IATA IS-XML e-invoicing standard for ground handlers
- **PDF** — Secondary format for handlers/airlines not yet XML-ready

#### FR-INV-04: GDS Integration (Level 2/3)

- On entering date ranges and parameters, system queries GDS to auto-populate flight details
- User can override/edit auto-populated data

### 3.4 Dispute Management (Level 3)

#### FR-DM-01: Dispute Initiation

- Airline reviews invoice line items on the platform
- Marks specific line items as "Disputed" with:
  - Dispute reason (predefined categories — see below)
  - Comments
  - Supporting attachments

**Dispute Categories:**
1. Operational data mismatch
2. Contract rate/formula mismatch
3. Exchange rate mismatch
4. Referenced flight does not belong to the airline
5. Miscellaneous

#### FR-DM-02: Dispute Resolution Workflow

- Ground handler responds with justification and supporting materials
- Back-and-forth exchange until resolution
- On dispute acceptance by ground handler → system auto-generates a credit note (IATA XML)
- Credit note offsets the accepted disputed amount

### 3.5 Market Intelligence (Level 2/3)

#### FR-MI-01: Airport Cost Index

- Aggregated cost index per airport/region (not individual supplier data)
- Dimensions: service type, aircraft type, international vs. domestic
- Requires 2–3+ suppliers per airport for meaningful aggregation
- Confidentiality safeguard: only aggregated data is published

#### FR-MI-02: Service Provider Marketplace

- Suppliers list their service offerings at airports
- Airlines browse available services and initiate RFPs
- Airlines see whether their existing rates are premium (top 25%), mid-range (mid 50%), or discount (bottom 25%) relative to the market — dimensioned by aircraft type

---

## 4. Reporting & MIS

### 4.1 Supplier Reports

| ID | Report | Description | Visualizations | Level |
|---|---|---|---|---|
| SFR1 | Receivables Summary | Outstanding receivables by airline, airport | Pie chart (airline-wise, airport-wise); Aging analysis | 1 |
| SFR2 | Invoiced Amounts | Monthly invoiced amount trends | Bar graph (airport, airline, currency, aircraft type) | 1 |
| SFR3 | Revenue per Flight | Revenue per invoiced flight | Line graph (aircraft, airport, airline) | 1 |
| SFR4 | Pending Invoicing | Amounts waiting to be invoiced (based on billing frequency, GDS data, contracts) | Pie chart (airport, airline) | 2/3 |
| SOR1 | Contracts Expiry | Contracts approaching expiration | Table (airline, airport, service type, days to expiry) | 1 |
| SOR2 | Operational Footprint | Geographic footprint of operations | Map with airline/service type dropdowns | 2/3 |
| SOR3 | RFP Summary | Review requests and proposals from airlines | Table; Map view at Level 3 | 2/3 |
| SDR1 | Dispute Summary | Disputes by type and value | Pie chart by disputed value; Table view | 3 |

**Shared Dimensions:** Airline, airport, country, regional classification, supplier-specific classification, currency, aircraft type, service type

**Drill-downs:** All financial reports drill down to underlying invoice-level data.

### 4.2 Airline Reports

| ID | Report | Description | Visualizations | Level |
|---|---|---|---|---|
| AFR1 | Billed Amounts | Amounts billed by suppliers (airport-wise, service-wise) | Pie chart, bar graph | 2 |
| AFR2 | Expected Billing | Projected billing based on frequency | Line graph (day vs. amounts) | 2/3 |
| AOR1 | Contracts Expiry | Contracts approaching expiration | Table; Map-based view | 2 |
| AOR2 | Current Footprint | Airports, services, and suppliers | Map with mouseover for rates and invoiced values | 2 |
| AOR3 | Review Requests | Contract review requests summary | Table (airport, service, supplier) | 2 |
| ADR1 | Dispute Summary | Disputes raised (similar to SDR1, airline perspective) | Table; Map/pie at scale | 3 |

**Note:** Report access may be restricted per airline/supplier. Report availability can also be tied to platform pricing tiers.

---

## 5. IATA Charge Codes (Service Taxonomy)

All services defined in contracts must map to one of the following IATA charge codes:

| # | Charge Code |
|---|---|
| 1 | Baggage |
| 2 | Baggage Delivery |
| 3 | Cargo Handling |
| 4 | Catering |
| 5 | Cleaning |
| 6 | Commission |
| 7 | Crew Accommodation |
| 8 | Crew Transportation |
| 9 | Customs Service Charge |
| 10 | Deicing |
| 11 | Departure Stamps |
| 12 | Immigration Fines |
| 13 | Lounges |
| 14 | Miscellaneous |
| 15 | Mishandling Baggage |
| 16 | Mishandling Passenger |
| 17 | Motor Fuel |
| 18 | Passenger Handling |
| 19 | Passenger Transportation |
| 20 | Passenger Security |
| 21 | Ramp Handling |
| 22 | Rent Equipment |
| 23 | Stand |
| 24 | STPC |
| 25 | Utilities |

---

## 6. Roles & Permissions

### 6.1 Ground Handler Roles

| Role | Description | Restrictive Dimensions |
|---|---|---|
| Admin | Sets supplier-specific parameters, assigns user roles | — |
| Contract Entry | Enters and maintains contracts | Airport, Airline, Service Type |
| Contract Reviewer/Approver | Reviews and approves entered contracts | Airport, Airline, Service Type |
| Invoice Entry | Keys in operational/flight data for invoices | Airport, Airline, Service Type |
| Invoice Approver | Approves and submits invoices for sending to airline | Airport, Airline, Service Type |
| Invoice Status Updater | Updates invoice paid/unpaid status | Airport, Airline, Service Type |
| MIS Viewer | Access to MIS dashboards and reports | Airport, Airline, Service Type |
| RFP Monitor & Responder | Monitors and responds to airline RFPs | Airport, Airline, Service Type |
| Dispute Handler | Accepts/responds to disputes, requests credit notes | Airport, Airline, Service Type |
| Dispute Approver | Authorizes credit notes for airlines | Airport, Airline, Service Type |

### 6.2 Airline Roles

| Role | Description | Restrictive Dimensions |
|---|---|---|
| Invoice Reviewer | Views invoices | Airport, Service Type |
| Invoice Disputer | Raises and closes disputes | Airport, Service Type |
| Contract Viewer | Views airline-specific contracts | Airport, Service Type |
| Contract Reviewer | Raises contract review requests | Airport, Service Type |
| RFP Raiser | Issues RFPs for services at airports | Airport, Service Type |
| MIS Viewer | Accesses MIS dashboards | Airport, Service Type |
| Payment Status Updater | Updates paid status for invoices | Airport, Service Type |

**Note:** A single user can hold multiple roles. All roles support dimensional access control.

---

## 7. Key Integrations

| Integration | Purpose | Level |
|---|---|---|
| **IATA IS-XML** | Invoice and credit note generation in standard XML format | 1 |
| **Email / SMTP** | Invoice delivery to airline-configured email addresses | 1 |
| **GDS (Global Distribution System)** | Auto-populate flight data (dates, aircraft, routes) | 2/3 |
| **Exchange Rate Feed** (Bloomberg/Reuters) | Currency conversion for cross-currency invoicing | 2/3 |
| **IATA Clearing House (ICH)** | Settlement submission for eligible ground handlers | Future |

---

## 8. Platform Setup & Configuration

| Parameter | Description |
|---|---|
| Enabled Airlines per Supplier | Platform-controlled; tied to subscription/payment |
| Enabled Airports per Supplier | Platform-controlled; tied to subscription/payment |
| Airline Email IDs | Configured per ground handler–airline pair for invoice dispatch |
| Invoice Date Backdating Rules | Supplier-specific parameter controlling how far back an invoice date can be set |
| Regional Classifications | Supplier-specific groupings of airlines and airports for reporting |
| MTOW Reference Data | Self-updating registry of tail numbers with industry reference and actual MTOW weights |

---

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Multi-tenancy** | Platform must support multiple ground handlers and airlines as isolated tenants |
| **Data Confidentiality** | Supplier-specific data must never be exposed to other suppliers; aggregated data only for market intelligence |
| **Access Control** | Role-based access with dimensional restrictions (airport, airline, service type) |
| **Audit Trail** | All contract, invoice, and dispute actions must be logged with timestamps and user info |
| **IATA XML Compliance** | Invoice and credit note output must comply with IATA IS-XML e-invoicing standard for ground handlers |
| **Scalability** | Architecture should support growing from a few pilot suppliers to industry-wide adoption |
| **Report-Level Access** | Specific reports can be restricted per customer; may be tied to pricing tiers |

---

## 10. Open Items & Technical Risks

| # | Item | Status |
|---|---|---|
| 1 | Full technical assessment of IATA IS-XML standard for invoice/credit note generation | Pending |
| 2 | Tax code handling within IATA XML — requires deeper XML spec study | Pending |
| 3 | Mandatory vs. optional fields in invoice line items — requires XML spec study | Pending |
| 4 | MTOW data source and self-updating mechanism for tail number registry | To be designed |
| 5 | GDS integration approach and provider selection | Deferred to Level 2 |
| 6 | Exchange rate feed integration (Bloomberg/Reuters) | Deferred to Level 2/3 |
| 7 | Confidentiality framework for market intelligence data | Requires stakeholder debate before Level 2 |
| 8 | ICH membership pathway and submission mechanism | Future consideration |
| 9 | Payment terms logic (auto-calculate due dates) | Deferred; manual entry for now |

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Ground handlers onboarded (Level 1) | Critical mass in target regions |
| Invoices generated in IATA XML format | Measurable adoption per supplier |
| Invoice processing time reduction (airline side) | Baseline to be established |
| Payment cycle improvement for ground handlers | Reduction in days-to-payment |
| Airline participation rate (Level 2) | Number of airlines actively using the platform |
| Dispute resolution time (Level 3) | Average time from dispute raised to resolution |
