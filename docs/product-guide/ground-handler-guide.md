# Ground-Handler Guide

## Monitor Performance & Operations on the Dashboard

Open **Dashboard** to access executive analytics, receivables tracking, contract health, and operational overviews:

### Financial & Operational KPIs (SFR1, SFR2, SFR3, SOR1)

- **Outstanding Receivables**: Total uncollected revenue with age breakdown buckets (0–30, 31–60, 61–90, 90+ days).
- **Invoiced Amount**: Current month billing volume compared with historical monthly trends.
- **Active Disputes**: Volume and value of invoices currently marked `DISPUTED`.
- **Revenue per Flight**: Average billed revenue per handled flight turnaround across airlines and stations.
- **Contracts Expiring Soon**: Sortable table of contracts expiring within the next 90 days to prioritize contract renewal workflows.

### Supplier Operational Footprint (SOR2) & Pending Invoicing (SFR4)

- **Operational Footprint (SOR2)**: Interactive airport station view showing your enabled stations, contracted airlines, active service lines, and station volume.
- **Pending Invoicing (SFR4)**: Real-time calculation of flight operational turnarounds that have occurred and are due for billing based on contract frequency, but have not yet been linked to a draft or finalized invoice. Displays pending unbilled revenue grouped by currency, airline, and station.

## Create & Manage Contracts

1. Navigate to **Contracts** and click **New Contract**.
2. **Basic Details**: Select the target airline, airport hub, contract start/end dates, and billing currency.
3. **Services & Pricing**: Add one or more service lines. For each service:
   - Select the **IATA Charge Code** (e.g. `01.01 Ramp Handling`, `02.01 Passenger Check-in`).
   - Assign the **Pricing Formula**:
     - `PF-01`: Flat rate per flight / turnaround.
     - `PF-02`: Variable charge per passenger.
     - `PF-03`: Weight-based rate per ton of cargo / mail.
     - `PF-04`: Tiered / slab volume pricing based on monthly turnaround count.
     - `PF-05`: Time-banded pricing (e.g. night operations, peak vs off-peak).
     - `PF-06`: Daily / period rate.
     - `PF-07`: Aircraft MTOW weight-based formula with automatic tail registry lookup and aircraft-type fallback.
   - Enter rates, quantity drivers, units of measure (UoM), and applicable tax codes.
4. **Review & Submit**: Verify summary terms and click **Submit Contract**.

### Contract Approval Workflow

- **Drafts**: Click **Submit for Approval** to transition to `SUBMITTED`.
- **Pending Approval**: Authorized contract approvers can select **Approve** or **Request Review** (with required feedback comments).
- **Approved**: The contract becomes active for flight billing.
- **Audit Trail**: Every creation, submission, approval, and review request is recorded with timestamps and user identifiers.

## Process Airline Contract-Review Requests

1. Open **Review Requests** from the sidebar.
2. View pending requests submitted by airline procurement teams.
3. Review the airline's specific commentary regarding rates, SLA terms, or volume commitments.
4. Modify the contract if agreed and resubmit for approval.

## Create & Calculate Flight Invoices

Invoices can only be created against active, `APPROVED` contracts covering the flight date and service types.

1. Navigate to **Invoices** and click **New Invoice**.
2. **Header Information**: Select the airline, airport station, invoice number, issue date, payment due date, and currency. If the invoice currency differs from the contract currency, enter the foreign exchange rate and rate source.
3. **Flight Line Items**: Add flight turnaround records:
   - Flight date (validated strictly against the contract validity window).
   - Flight number, aircraft registration (tail ID), aircraft type, origin, and destination.
   - Select contracted service and enter operational quantities (e.g. passenger count, cargo weight, turnaround duration).
4. **Auto-Calculation**: The pricing engine applies the contract formula (PF-01 through PF-07) and calculates the exact line amount in real-time.
5. **Review & Submit**: Verify line items, currency conversion, and total header sum. Click **Submit Draft Invoice**.

## Finalize, Approve & Dispatch Invoices

From the **Invoices** list:

1. **Finalize**: Transition complete draft to `FINALIZED`.
2. **Approve**: An authorized invoice approver reviews line items and selects **Approve** (or **Request Modification** with comments).
3. **Send (Dispatch)**:
   - Dispatches the invoice asynchronously.
   - Generates the standard **IATA IS-XML** file and **PDF Invoice**.
   - Sends email dispatch notifications to configured airline billing contacts.
   - Locks the invoice against further edits (`SENT`).
   - Download the generated XML and PDF files directly from the invoice actions menu.

## Payment Tracking & Settle Invoices

When settlement is received:
1. Locate the invoice with status `SENT` or `DISPUTED`.
2. Click **Mark Paid**.
3. Record the settlement confirmation. The status updates to `PAID` across both ground-handler and airline workspaces.

## Manage Airline Disputes & Issue Credit Notes

When an airline disputes an invoice line item:

1. Open **Disputes** to view the dispute queue (SDR1).
2. Metric summary cards display total disputed exposure, auto-issued credit notes, active queue count, and resolved items.
3. Click **View Thread & Act** to open the dispute resolution modal.
4. **Dispute Thread Actions**:
   - **Respond**: Submit operational flight logs, explanation, and upload supporting files (PDF, images, CSV, XML up to 10MB) scanned via ClamAV.
   - **Accept**: If the dispute is valid, click **Accept**. The system automatically generates an application-contract **IATA IS-XML Credit Note** (`is-credit-note.xsd`), offsets the disputed amount, and updates the dispute to `ACCEPTED`.
   - **Reject**: Provide formal justification and reject the dispute.

For full dispute procedures, see [Disputes and Credit Notes](disputes-and-credit-notes.md).

## Publish Service Offerings & Respond to RFPs

- **Service Offerings**: Publish airport station capabilities so airlines can discover your ground handling services in the marketplace.
- **RFP Summary (SOR3)**: Review incoming procurement RFPs, submit structured commercial proposals with rates and terms, and monitor contract awards.

For procurement details, see [Marketplace and RFPs](marketplace-and-rfps.md).
