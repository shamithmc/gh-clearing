# Canonical Architecture Contract: Airline Ground Handling Cost Management Platform

**Document Version:** 1.0.0  
**Status:** Canonical / Active  
**Scope:** Ground Handling Cost Management Platform (Levels 1, 2, and 3)  
**Created:** 2026-07-16  

---

## Normative Note

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals, as shown here.

A system release **MAY** implement only a subset of the capabilities defined in this contract. However, any implemented part **MUST NOT** contradict, bypass, or claim guarantees beyond those specified in this contract. Future extensions and implementation variations **MUST** conform to the constraints and invariants defined herein.

---

# 1. Purpose

The Airline Ground Handling Cost Management Platform enables ground handling service providers and airlines to register service contracts, calculate contract-compliant charges from flight operations data, generate industry-standard IATA IS-XML invoices, and resolve billing disputes within a secure, multi-tenant environment.

The single hardest boundary of the system is:
> The Contract Registry and Calculation Engine own the canonical representation of ground handling contracts, flight metrics, and charge computations; all other internal modules and external integrations are replaceable consumers of this billing authority.

### Canonical Interaction Cycle
The system operates on a recurring, stateful transaction cycle:
1. **Contract Registration**: Ground Handlers enter contract terms and formulas, which are validated and approved.
2. **Operational Data Capture**: Ground Handlers capture raw operational flight details and quantities.
3. **Calculation & Verification**: The system evaluates operational records against active contracts to produce calculated charge lines.
4. **Invoice Generation & Dispatch**: The system packages verified charge lines into an Invoice, validates it against the IATA IS-XML schema, and dispatches it to the Airline.
5. **Collaborative Resolution**: The Airline reviews the Invoice and either marks it paid or initiates a Dispute, which proceeds through a structured workflow to resolution, generating a Credit Note if a dispute is accepted.

---

# 2. Kernel and Laws

## 2.1 Kernel Primitives

The system is defined in terms of the following eight core primitives:

1. **Tenant**: A logically isolated organization operating on the platform, defined as either a Ground Handler (Supplier) or an Airline (Customer).
2. **Contract**: A normative agreement between a Ground Handler and an Airline specifying active airports, service types, validity periods, and pricing formulas.
3. **Service Type**: A canonical service classification mapped to one of the standard IATA charge codes.
4. **Pricing Formula**: An executable mathematical logic template that converts operational metrics into calculated line costs.
5. **Operational Flight Record**: A transactional event log capturing flight-level metrics (tail ID, route, quantities) that serve as drivers for pricing formulas.
6. **Invoice**: A locked financial billing package representing a set of calculated charge lines derived from operational records and active contracts.
7. **Dispute**: An audit-logged, stateful objection raised by an Airline against specific Invoice charge lines.
8. **Credit Note**: An offsetting financial document automatically generated in IATA IS-XML format upon the acceptance of a Dispute.

## 2.2 Laws

The following laws are memorable, invariable guarantees stated as logical properties of the system:

- **Law of Tenant Isolation**: Data from one Tenant **MUST NOT** be accessible, visible, or inferable by any other Tenant unless explicitly authorized by a bilateral Contract or an active Dispute workflow.
- **Law of Contract Obligation**: Every charge line computed in the system **MUST** map to an approved, active Contract and a valid Service Type; orphaned charges **MUST NOT** exist.
- **Law of Safe Defaults**: Any input, status, or transition not explicitly permitted by the platform's configuration and active rules **MUST** fail closed and deny processing.
- **Law of Dispatched Immutability**: Once an Invoice or Credit Note is dispatched to an Airline, its content and status are immutable; corrections **MUST** be executed using offsetting Credit Notes or subsequent adjustment Invoices.
- **Law of Dimensional Restriction**: All user sessions **MUST** be bound by role permissions and dimensional attributes (Airport, Airline, Service Type) restricting both read and write operations.
- **Law of XML Compliance**: Every dispatched Invoice and Credit Note record **MUST** strictly validate against the official IATA IS-XML schema; invalid structures **MUST** fail to export and dispatch.

## 2.3 Compositional Contracts

The kernel primitives are grouped into the following four compositional contracts:
1. **Contract & Identity Registry Contract** (Section 3)
2. **Pricing & Calculation Engine Contract** (Section 4)
3. **Billing & Dispatch Contract** (Section 5)
4. **Dispute Resolution Contract** (Section 6)

---

# 3. Contract & Identity Registry Contract

## 3.1 Tenant Isolation
3.1.1 The system **MUST** partition all data records using a tenant identifier.  
3.1.2 Every database query and command **MUST** include the tenant identifier of the authenticated context.  
3.1.3 Cross-tenant operations **MUST** be restricted to explicitly configured bilateral relationships. The only allowed bilateral relationships are those defined by an active Contract or an active Dispute workflow.  
3.1.4 A Tenant **MUST** belong to one of the following closed, versioned list of Tenant Types:
* `GROUND_HANDLER` (Supplier)
* `AIRLINE` (Customer)
* `PLATFORM_ADMIN` (System Owner)

Unsupported Tenant Type values **MUST** fail closed. The list of Tenant Types widens only by explicit amendment to this contract.

## 3.2 Role and Dimensional Access Control
3.2.1 Users **MUST** be authenticated before accessing any system resource.  
3.2.2 Every User **MUST** be assigned one or more Roles within their Tenant.  
3.2.3 The system **MUST** enforce the following closed, versioned lists of Roles:

**Ground Handler User Roles:**
* `ADMIN`: Configures tenant settings, user accounts, and credentials.
* `CONTRACT_ENTRY`: Enters and edits contracts.
* `CONTRACT_APPROVER`: Reviews, approves, or requests reviews for entered contracts.
* `INVOICE_ENTRY`: Enters operational/flight data.
* `INVOICE_APPROVER`: Approves, edits, and finalizes invoices.
* `STATUS_UPDATER`: Marks invoices as paid or disputed.
* `MIS_VIEWER`: Accesses supplier-specific reports and dashboards.
* `RFP_MONITOR`: Views and responds to RFPs and review requests.
* `DISPUTE_HANDLER`: Handles dispute communications and requests credit notes.
* `DISPUTE_APPROVER`: Authorizes credit note generation.

**Airline User Roles:**
* `INVOICE_REVIEWER`: Views received invoices and downloads XML/PDF files.
* `INVOICE_DISPUTER`: Initiates, modifies, and resolves disputes.
* `CONTRACT_VIEWER`: Views contracts registered with ground handlers.
* `CONTRACT_REVIEWER`: Initiates contract review requests.
* `RFP_RAISER`: Issues RFPs for services at airports.
* `MIS_VIEWER`: Accesses airline-specific dashboards.
* `PAYMENT_UPDATER`: Updates paid status of invoices.

**Platform Admin User Roles:**
* `SUPER_ADMIN`: Provisioning tenants, managing global configurations, and seeding reference data.

Unsupported Role values **MUST** fail closed and deny access. The lists of Roles widen only by explicit amendment to this contract.

3.2.4 Every Role **MUST** support the association of Dimensional Restrictions. The closed, versioned list of Dimensional Restrictions is:
* `AIRPORT`: Restricts operations to specific airport IATA codes.
* `AIRLINE`: Restricts operations to specific airline IATA codes.
* `SERVICE_TYPE`: Restricts operations to specific IATA charge codes.

3.2.5 The system **MUST** deny any operation where the target record's Airport, Airline, or Service Type does not match the authenticated User's Dimensional Restrictions.

3.2.6 The system **MUST** resolve permission and access control conflicts using the following explicit precedence hierarchy: `prohibition` > `deny` > `require` > `permit` > `default-deny`.
3.2.7 Any transaction, data access, or state transition that is not explicitly permitted by a Role and its active Dimensional Restrictions **MUST** fail closed and be denied by default (default-deny). If a user holds multiple roles where one role denies an action or dimension, that denial **MUST** override all permits.

## 3.3 Contract Lifecycle
3.3.1 A Contract **MUST** progress through a state machine governed by the following closed, versioned list of Contract Statuses:
* `DRAFT`: Editable, invisible to the counter-party.
* `PENDING_APPROVAL`: Locked, awaiting internal approver action.
* `APPROVED`: Active, ready for invoice calculation, visible to both counterparties.
* `REVIEW_REQUESTED`: Marked for modification, returned to `CONTRACT_ENTRY`.
* `EXPIRED`: Read-only, inactive due to date range expiration.

Unsupported Status values **MUST** fail closed. The list of statuses widens only by explicit amendment to this contract.

3.3.2 A Contract **MUST** define:
* A single Ground Handler Tenant and a single Airline Tenant.
* A validity period consisting of a `START_DATE` and an `END_DATE`, where `START_DATE` is less than or equal to `END_DATE`.
* One or more Service Types mapped to IATA charge codes.
* A single Pricing Formula configuration per Service Type.

3.3.3 The system **MUST** maintain a closed, versioned list of Service Types mapping to the following 25 IATA Charge Codes:
1. `BAGGAGE`
2. `BAGGAGE_DELIVERY`
3. `CARGO_HANDLING`
4. `CATERING`
5. `CLEANING`
6. `COMMISSION`
7. `CREW_ACCOMMODATION`
8. `CREW_TRANSPORTATION`
9. `CUSTOMS_SERVICE_CHARGE`
10. `DEICING`
11. `DEPARTURE_STAMPS`
12. `IMMIGRATION_FINES`
13. `LOUNGES`
14. `MISCELLANEOUS`
15. `MISHANDLING_BAGGAGE`
16. `MISHANDLING_PASSENGER`
17. `MOTOR_FUEL`
18. `PASSENGER_HANDLING`
19. `PASSENGER_TRANSPORTATION`
20. `PASSENGER_SECURITY`
21. `RAMP_HANDLING`
22. `RENT_EQUIPMENT`
23. `STAND`
24. `STPC`
25. `UTILITIES`

Unsupported IATA Charge Codes **MUST** fail validation and reject contract registration. The list of IATA Charge Codes widens only by explicit amendment to this contract.

3.3.4 An approved Contract **MUST NOT** be modified. Any changes **MUST** be executed by creating a new version of the Contract, which **MUST** undergo the full approval cycle.

---

# 4. Pricing & Calculation Engine Contract

## 4.1 Pricing Formulas
4.1.1 The system **MUST** calculate charges using one of the following closed, versioned list of Pricing Formula Types:
* `PF-01` (Unit Rate): `Rate * Quantity`
* `PF-02` (Unit Rate Compound): `Rate * Quantity_1 * Quantity_2`
* `PF-03` (Slab-Based Incremental): Tiered pricing per quantity band, where each band is charged at its specific rate.
* `PF-04` (Slab-Based All-Units): Entire quantity is repriced at the tier rate triggered by the threshold.
* `PF-05` (Time-Based): Rate varies dynamically based on the local time-of-day of the flight operation.
* `PF-06` (Day/Period-Based): Rate varies dynamically based on the day-of-week or calendar period of the flight operation.
* `PF-07` (MTOW-Based): Rate is calculated based on the Maximum Takeoff Weight of the aircraft tail registration.

Unsupported formula types **MUST** fail compilation and execution. The list of formula types widens only by explicit amendment to this contract.

4.1.2 Every Pricing Formula configuration **MUST** be stored in a structured JSON schema validating:
* Supported quantity driver keys.
* Unit of measure (UoM) keys.
* Numerical rate bounds.

4.1.3 The Pricing Engine **MUST** evaluate calculations deterministically. If any required operational driver input is missing, null, or of an incorrect data type, the calculation **MUST** fail closed, return no calculated charge, and block invoice progression.

## 4.2 Reference Data Validation
4.2.1 Calculations using `PF-07` **MUST** query the MTOW Reference Data registry using the flight's aircraft registration tail number.  
4.2.2 If a tail number is not found in the MTOW Reference Data registry, the calculation engine **MUST** fallback to the industry-standard reference weight for the aircraft type. If both tail number and aircraft type reference weights are missing, the calculation **MUST** fail closed.  
4.2.3 The system **MUST** support manual overrides of MTOW values only if the override is accompanied by a mandatory audit-logged justification comment.

---

# 5. Billing & Dispatch Contract

## 5.1 Invoice Creation and Validation
5.1.1 Invoices **MUST** progress through a state machine governed by the following closed, versioned list of Invoice Statuses:
* `DRAFT`: Editable, temporary status.
* `FINALIZED`: Sealed by the creator, awaiting approver review.
* `APPROVED`: Approved by the internal approver, ready for dispatch.
* `SENT`: Dispatched to the airline email/system, locked.
* `PAID`: Marked settled by either Ground Handler status updater or Airline payment updater.
* `DISPUTED`: Marked disputed, triggering the dispute resolution workflow.

Unsupported Status values **MUST** fail closed. The list of statuses widens only by explicit amendment to this contract.

5.1.2 The system **MUST** enforce invoice number uniqueness. An Invoice **MUST NOT** be saved if its alphanumeric identifier matches another invoice within the same invoicing Ground Handler and Airline pair.  
5.1.3 The system **MUST** validate that the flight dates in all operational line items fall within the active period of the referenced Contract.  
5.1.4 Cross-currency validation:
* If the Invoice currency differs from the Contract currency, the system **MUST** require a non-zero, positive exchange rate.
* The system **MUST** record the exchange rate source in the invoice header metadata.

## 5.2 Document Generation and Immutability
5.2.1 Once an Invoice transitions to the `SENT` state, the Invoice record and its associated charge lines **MUST** become read-only and immutable.  
5.2.2 The system **MUST** generate two formats for every dispatched invoice:
* **Primary format**: IATA IS-XML document.
* **Secondary format**: PDF document.

5.2.3 The system **MUST** validate the generated XML output against the official IATA IS-XML e-invoicing schema before updating the status to `SENT`. If XML validation fails, the dispatch process **MUST** abort, fail closed, and flag the invoice as error-state.

---

# 6. Dispute Resolution Contract

## 6.1 Dispute Initiation
6.1.1 An Airline user **MUST NOT** initiate a Dispute unless the target Invoice is in the `SENT` state.  
6.1.2 A Dispute **MUST** target specific invoice charge lines; bulk or blanket disputes without line-item references **MUST NOT** be accepted.  
6.1.3 When initiating a dispute, the user **MUST** select a category from the following closed, versioned list of Dispute Categories:
* `OPERATIONAL_DATA_MISMATCH` (flight counts, counters, deicing volume discrepancies)
* `CONTRACT_RATE_MISMATCH` (formula evaluation or base rate discrepancies)
* `EXCHANGE_RATE_MISMATCH` (currency conversion rate discrepancies)
* `ROUTING_MISMATCH` (flight does not belong to the airline or wrong airport)
* `MISCELLANEOUS` (any other dispute reasons)

Unsupported Dispute Category values **MUST** fail closed. The list of categories widens only by explicit amendment to this contract.

6.1.4 The dispute entry **MUST** require a non-empty text comment and allow PDF/image attachments.

## 6.2 Dispute Workflow and Credit Note Generation
6.2.1 A Dispute **MUST** progress through a state machine governed by the following closed, versioned list of Dispute Statuses:
* `OPEN`: Initial state, visible to Ground Handler dispute handlers.
* `UNDER_REVIEW`: Ground Handler has acknowledged and is verifying.
* `RESPONDED`: Ground Handler has submitted justification back to the Airline.
* `ACCEPTED`: Ground Handler accepts the dispute, triggering credit note generation.
* `REJECTED`: Ground Handler rejects the dispute, awaiting Airline action.
* `ESCALATED`: Awaiting manual administrative mediation.

Unsupported Dispute Status values **MUST** fail closed. The list of statuses widens only by explicit amendment to this contract.

6.2.2 Upon transition of a Dispute to `ACCEPTED`, the system **MUST** automatically generate a Credit Note.  
6.2.3 The Credit Note value **MUST** equal the accepted disputed charge amount and **MUST** reference the original Invoice number.  
6.2.4 The cumulative value of all Credit Notes associated with an Invoice **MUST NOT** exceed the total value of the original Invoice.  
6.2.5 Credit Notes **MUST** be generated in IATA IS-XML format and validated against the schema before dispatch.

---

# 7. Non-Negotiable Invariants

The system must satisfy the following non-negotiable invariants at all times. Any action or state violating these invariants represents a system failure and **MUST** result in an immediate transaction rollback.

- **INV-01 — Tenant Boundary Isolation.** A Tenant user **MUST NOT** read or write any record belonging to another Tenant, preventing cross-tenant data leaks.
- **INV-02 — Dimensional Scope Enforcement.** A user session containing restrictive dimensions (Airport, Airline, Service Type) **MUST NOT** read or write records outside those dimensions, preventing unauthorized regional or service-specific access.
- **INV-03 — Contract State Transition Guard.** A Contract **MUST NOT** transition from `DRAFT` directly to `APPROVED` without passing through `PENDING_APPROVAL` and being acted on by an authorized Approver, preventing unreviewed rate changes.
- **INV-04 — Formula Evaluation Determinism.** A Pricing Formula calculation **MUST NOT** produce a monetary cost that is negative or non-numeric, preventing financial corruption.
- **INV-05 — PF-07 Tail ID Requirement.** A calculation using pricing formula `PF-07` (MTOW-based) **MUST** fail and rollback if the aircraft tail ID does not exist in the MTOW Reference Data registry and no default reference weight exists for the aircraft type, preventing unpriced flights.
- **INV-06 — Cross-Currency Exchange Rate Mandate.** An Invoice whose billing currency differs from the Contract currency **MUST NOT** be saved without an explicit, non-zero, positive Exchange Rate value, preventing zero-value conversion errors.
- **INV-07 — Invoice Number Uniqueness.** An Invoice **MUST NOT** share an `Invoice Number` with another invoice belonging to the same Ground Handler and Airline pair, preventing duplicate billing claims.
- **INV-08 — Dispatched Invoice Immutability.** An Invoice in the `SENT`, `PAID`, or `DISPUTED` state **MUST NOT** be modified or deleted, preventing historical billing manipulation.
- **INV-09 — IATA IS-XML Compliance Guard.** An Invoice or Credit Note record **MUST NOT** be marked `SENT` if its structure fails to validate against the official IATA IS-XML schema, preventing non-standard file transmission.
- **INV-10 — Dispute Line Item Constraint.** An Airline user **MUST NOT** initiate a Dispute against an Invoice that is in `DRAFT` or `FINALIZED` status, preventing premature complaints before dispatch.
- **INV-11 — Credit Note Value Limit.** The total value of all Credit Notes generated for a disputed Invoice **MUST NOT** exceed the total value of the original Invoice, preventing over-refunding of disputes.
- **INV-12 — Closed Vocabulary Enforcement.** Any input containing values outside the defined Closed Vocabularies (Tenant Type, User Role, Contract Status, Service Type, Pricing Formula Type, Invoice Status, Dispute Category, Dispute Status) **MUST** fail closed immediately and reject transaction processing, preventing corrupt configurations from being written to the database.

---

# 8. End-State Summary

The Airline Ground Handling Cost Management Platform provides a multi-tenant environment facilitating automated calculation, verification, and dispatch of IATA-standard electronic invoices against structured service contracts, complete with collaborative dispute resolution. All operations are bound by role-based and dimensional permissions to enforce strict data isolation between ground handlers and airlines, ensuring that financial outputs conform to industry schemas.

> The Contract Registry and Calculation Engine own the canonical representation of ground handling contracts, flight metrics, and charge computations; all other internal modules and external integrations are replaceable consumers of this billing authority.

---

# Appendix: Open Questions

The following questions represent areas of ambiguity in the system requirements that **MUST** be resolved in subsequent amendments to this contract:
1. **Tax Code XML Mapping**: The precise translation of local country tax rules (VAT, GST) to the tax elements in the IATA IS-XML schema is undefined. The system temporarily enforces percentage-based calculations, but a standardized tax-rule registry is required.
2. **Bloomberg/Reuters Feed Failure Policy**: The system requires an exchange rate for cross-currency invoicing. If the live feed fails and a user attempts to finalize an invoice, the policy on allowed age of cached exchange rates before forcing manual override is unspecified.
3. **Tail ID Registry Sync Frequency**: The update interval and sync source for the tail number registration database (connecting tail IDs to manufacturer models and MTOW specifications) remains unspecified.
4. **IATA Clearing House (ICH) Settlement Schema**: The format adjustments and submission protocols required for direct ICH routing are deferred and must be specified before entering Level 4 (Future).
