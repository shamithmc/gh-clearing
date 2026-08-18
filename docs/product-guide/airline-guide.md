# Airline Guide

## Monitor Performance & Operations on Airline Home

Open **Airline Home** for executive analytics, financial exposure, contract lifecycle, and footprint overviews:

### Financial & Operational Analytics (AFR1, AFR2, AOR1, AOR2)

- **Billed Amounts (AFR1)**: Current and historical invoiced handling costs across suppliers and stations.
- **Expected Billing Projections (AFR2)**: Projections based on active contracts and planned flight schedules.
- **Contract Expiry Timeline (AOR1)**: Interactive timeline and table of contracts expiring in 30, 60, and 90 days.
- **Current Geographic Footprint (AOR2)**: Station map and metrics showing active airports, handling suppliers, and service lines.

## Contract Review & Review Requests (AOR3)

1. Open **Contracts** to browse all active approved ground-handling contracts scoped to your airline.
2. Filter contracts by supplier, airport station, currency, and date ranges.
3. **Submit Review Requests**: If contract terms, SLA performance, or volume commitments need renegotiation:
   - Click **Request Review** on the active contract.
   - Enter detailed comments specifying proposed changes.
   - The contract transitions to `REVIEW_REQUESTED`, alerting the ground handler to launch the edit wizard and resubmit revised terms.
4. Track all submitted review requests in **Review Requests**.

## Audit & Settle Invoices

1. Open **Invoices** to view all dispatched invoices from ground handlers (`SENT`, `DISPUTED`, `PAID`).
2. **Inspect Turnaround Flight Lines**: Review flight numbers, dates, aircraft registration, origin/destination, and auto-calculated service lines.
3. **Download Files**: Download official **IATA IS-XML** (`is-invoice.xsd`) and **PDF** formats for clearing-house archiving and local ERP ingestion.
4. **Mark Paid**: When payment settlement is cleared, click **Mark Paid** to update the invoice status to `PAID`.

## Raise Line-Item Disputes

When an invoice contains billing discrepancies (e.g. incorrect flight counts, rate mismatches, unrendered services):

1. Locate the invoice in **Invoices** and click **Raise Dispute** on the specific flight line item.
2. Select the dispute category (e.g., `RATE_MISMATCH`, `UNRENDERED_SERVICE`, `VOLUME_DISCREPANCY`, `SLA_BREACH`, `MISCELLANEOUS`).
3. Enter explanatory comments and the disputed monetary amount.
4. The invoice automatically transitions to `DISPUTED`.
5. Track dispute collaboration, exchange evidence attachments, and monitor credit-note issuance in **Disputes (ADR1)**.

For full dispute procedures, see [Disputes and Credit Notes](disputes-and-credit-notes.md).

## Procurement, Marketplace & RFP Management

### Discover Ground Handlers in the Marketplace

1. Open **Marketplace**.
2. Filter by region, airport, or service type.
3. Browse supplier capability descriptions, operating hours, and equipment strengths.
4. Click **Initiate RFP** from any listing to pre-fill airport and service parameters.

### Author, Publish & Edit RFPs

1. Open **RFPs**.
2. Under **Create RFP**:
   - Select the target airport station and service type.
   - Select the desired contract period.
   - Describe operational volumes, required SLAs, peak schedule requirements, and equipment standards.
3. Click **Publish RFP**. The platform automatically routes the RFP to all configured, eligible ground handlers.
4. **Edit Published RFPs**: While an RFP remains open, airlines can click **Edit** on any published RFP to update service requirements, duration, or specifications.

### Evaluate Proposals & Award Contracts

1. In **RFPs**, locate the published RFP and click **Review Proposals**.
2. Compare submitted ground-handler proposals: proposed rates, currency, validity, and commercial SLA terms (including revised bids).
3. **Reject**: Reject individual non-competitive proposals.
4. **Award**: Select **Award Contract** on the winning proposal. The system automatically creates a traceable draft contract for the supplier and rejects remaining proposals.
