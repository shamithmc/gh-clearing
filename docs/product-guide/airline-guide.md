# Airline Guide

## Use the Airline Workspace

The **Airline Clearing** workspace provides airline procurement, flight operations, and financial auditing teams with comprehensive visibility into ground handling contracts, dispatched invoices, market intelligence, RFPs, and dispute settlements.

All information and actions are automatically restricted to your airline tenant and assigned airport and service-type dimensions.

## View Contracts & Request Reviews

### View Contracts

1. Open **Contracts** from the navigation menu.
2. Filter by **Airport** or **Service Type**.
3. Inspect rate schedules, pricing formulas (PF-01 to PF-07), validity dates, and service specifications.
4. The contract view is read-only and displays only non-draft contracts active for your airline.

### Request a Contract Review

If contracted rates or SLA terms require renegotiation:

1. Locate the approved contract under **Contracts**.
2. Click **Request Review**.
3. Enter a mandatory review comment specifying the clause, service type, or rate requiring revision.
4. Click **Submit Request**. The request is routed to the ground handler's review queue.

To monitor your submitted requests, open **Review Requests** to view supplier response statuses and current contract states.

## View Dispatched Invoices & Download Documents

1. Open **Invoices**.
2. Filter by **Airport**, **Service Type**, or **Status** (`SENT`, `PAID`, `DISPUTED`).
3. Expand invoice line items to review flight dates, flight numbers, aircraft registrations, origins, destinations, contracted services, operational quantities, and calculated amounts.
4. **Download Documents**: Click **Download XML** to retrieve the IATA IS-XML e-invoice or **Download PDF** for the printable invoice statement.

## Mark Invoices as Paid

When treasury or financial settlement is complete outside the platform:

1. Locate the invoice with status `SENT` or `DISPUTED`.
2. Click **Mark Paid**.
3. Confirm the settlement dialog. The status changes to `PAID`, logged in the audit trail and visible to the supplier.

## Raise Line-Item Disputes

If flight operational logs, aircraft turnaround charges, or calculated rates do not match your operational records:

1. Open **Invoices** and locate the dispatched invoice (`SENT` or `DISPUTED`).
2. Click **Raise Dispute** on the invoice actions menu.
3. In the dispute dialog:
   - Select the **Dispute Category**:
     - `OPERATIONAL_DATA_MISMATCH`: Flight turnaround, times, or passenger/cargo counts differ from operational logs.
     - `RATE_DISCREPANCY`: Applied rate does not match the approved contract schedule.
     - `UNAUTHORIZED_SERVICE`: Uncontracted or unapproved services were billed.
     - `DUPLICATE_BILLING`: Flight or service already billed under another invoice.
     - `CALCULATION_ERROR`: Mathematical or currency conversion error.
   - Enter a detailed **Dispute Comment** with flight dates, numbers, and discrepancies.
4. Click **Submit Dispute**.
5. The invoice status updates to `DISPUTED`, and a new dispute record is opened in the **Disputes** workspace.

## Collaborate on Disputes & Track Credit Notes

Open **Disputes** from the sidebar to access the airline dispute workspace (ADR1):

1. **KPI Summary Cards**: Review total disputed exposure, credit notes issued to date, active dispute count, and resolved items.
2. **Dispute Queue**: Search by invoice or dispute number, filter by supplier, airport station, or tab (`ALL`, `OPEN`, `RESPONDED`, `RESOLVED`).
3. **Dispute Thread**: Click **View Thread & Act** to open the interactive resolution modal:
   - Review ground-handler responses, flight audit logs, and explanations.
   - **Upload Attachments**: Upload supporting evidence (PDF, PNG, JPEG, CSV, XML up to 10MB). Files are scanned for malware with ClamAV.
   - **Respond**: Submit counter-arguments and clarification.
   - **Escalate**: Escalate the dispute to commercial management if unresolved.
4. **Credit Note Settlement**: When the ground handler accepts the dispute, an application-contract **IATA IS-XML Credit Note** is auto-generated to offset the disputed amount.

For full dispute workflow instructions, see [Disputes and Credit Notes](disputes-and-credit-notes.md).

## Market Intelligence & Benchmarking

Open **Cost Index** to access aviation ground handling market analytics:

- **Airport Cost Index**: View aggregated average handling costs across airports, regions, aircraft categories, and operation types (International vs Domestic).
  - *Confidentiality Guarantee*: Metrics are displayed only when at least 2 distinct ground handling suppliers operate at the station, protecting commercial confidentiality.
- **Pricing Benchmark**: Compare your contracted rates against market quartiles (Top 25% Premium, Mid 50% Standard, Bottom 25% Competitive) to identify procurement cost-saving opportunities.

For more details, see [Market Intelligence and Analytics](market-intelligence-and-analytics.md).

## Airline Executive MIS Panels

Open **Airline Home** to view operational and financial dashboards:

- **Billed Amounts (AFR1)**: Supplier billing volume trends, station-wise spend, and service-type cost distributions.
- **Expected Billing (AFR2)**: Future projected handling expenditures based on active contract billing frequencies.
- **Contract Expiry (AOR1)**: Timeline of upcoming contract renewals and expirations.
- **Current Footprint (AOR2)**: Interactive geographical map of your active airport stations and contracted suppliers.

## Marketplace & Procurement RFPs

- **Marketplace**: Browse published ground handler station capabilities and service offerings. Click **Initiate RFP** to start a pre-populated procurement request.
- **RFPs**: Create and publish procurement RFPs with custom turnaround requirements, evaluate supplier rate proposals, and award contracts with automatic draft contract generation.

For complete procurement procedures, see [Marketplace and RFPs](marketplace-and-rfps.md).
