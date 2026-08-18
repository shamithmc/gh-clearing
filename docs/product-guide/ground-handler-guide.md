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

## Author & Edit Contracts

The Contract Wizard supports dynamic formula authoring for all 7 standard pricing formulas with dedicated sub-editors and visual review cards.

1. Navigate to **Contracts** and click **New Contract** (or click **Edit** on any `DRAFT` or `REVIEW_REQUESTED` contract).
2. **Step 1: Agreement Details**: Select the target airline, airport hub, contract start/end dates, and billing currency.
3. **Step 2: Services & Dynamic Pricing Formulas**:
   - Select the **IATA Charge Code** (e.g. `01.01 Ramp Handling`, `02.01 Passenger Check-in`).
   - Choose from the 7 dedicated pricing formula sub-editors:
     - **`PF-01` Flat / Unit Rate**: Enter unit rate, quantity driver (e.g., `turnarounds`, `flights`), and unit of measure (UoM).
     - **`PF-02` Compound Drivers**: Define multiple driver variables (e.g., `passengers`, `bags`, `pallets`) with custom tag weights. Requires at least 2 distinct driver tags.
     - **`PF-03` Incremental Tiers**: Configure progressive volume tiers with tier limits and rates. Includes monotonicity validation and quick-fill presets.
     - **`PF-04` All-Units Slabs**: Set volume thresholds where exceeding a slab applies a retroactively uniform rate across all volume.
     - **`PF-05` Time-Bands**: Set 24-hour time schedule windows (e.g., Day vs. Night, Peak vs. Off-Peak) with overnight span support.
     - **`PF-06` 7-Day Grid**: Configure day-of-week rate matrices with weekday/weekend uniform rate presets.
     - **`PF-07` MTOW Weight-Based**: Set rate per metric ton of Maximum Takeoff Weight (MTOW) with aircraft-type registry fallback and Tail ID resolution.
   - Enter applicable tax codes (e.g. `VAT-0`, `VAT-5`, `EXEMPT`).
4. **Step 3: Review & Submit**:
   - Inspect the **Formula Review Cards** displaying structured visual parameter breakdowns for each configured service.
   - Click **Submit Contract** (or **Save Changes** when in edit mode).

### Contract Editing & Revision Cycles

- **Edit Drafts**: Open **Contracts**, locate any contract in `DRAFT` status, and click **Edit** (`/contracts/:id/edit`). Preloads all formula parameters, service lines, and header details.
- **Handle Review Requests**: When a contract is in `REVIEW_REQUESTED` status:
  1. Open **Review Requests** (or **Contracts**).
  2. Inspect reviewer commentary regarding requested rate or SLA adjustments.
  3. Click **Edit Contract** to launch the wizard, modify the rates or formulas, and resubmit for approval.
- **Audit Logging**: All edits and state changes generate timestamped audit trail records (`CREATED`, `UPDATED`, `SUBMITTED`, `APPROVED`).

## Create & Calculate Flight Invoices

Invoices are generated against active `APPROVED` contracts covering the flight date and service types.

1. Navigate to **Invoices** and click **New Invoice** (or click **Edit** on a `DRAFT` or `MODIFICATION_REQUESTED` invoice).
2. **Header Information**: Select the airline, airport station, invoice number, issue date, payment due date, and currency. For cross-currency invoicing, enter the foreign exchange rate and rate source.
3. **Flight Line Items**: Add flight turnaround records:
   - Flight date (strictly validated against the contract validity window).
   - Flight number, aircraft tail ID (registration), aircraft type, origin, and destination.
   - Select contracted service and enter operational quantities (e.g. passenger count, cargo weight, turnaround duration).
4. **Auto-Calculation**: The pricing engine automatically executes the contract formula (PF-01 to PF-07) and calculates the exact line amount.
5. **Review & Save**: Verify calculations, exchange rates, and totals. Click **Submit Draft Invoice** (or **Save Changes** in edit mode).

### Invoice Editing & Modification Workflow

- **Edit Draft Invoices**: Invoices in `DRAFT` status can be edited at any time via the **Edit** action button in the Invoices list.
- **Supervisor Modification Requests**:
  1. If an invoice approver selects **Request Modification** and enters feedback, the invoice transitions to `MODIFICATION_REQUESTED`.
  2. The ground handler clicks **Edit** on the invoice to adjust flight lines, quantity drivers, or details.
  3. The updated invoice is saved and transitioned back to `FINALIZED` for final approval.

## Finalize, Approve & Dispatch Invoices

From the **Invoices** list:

1. **Finalize**: Transition complete draft to `FINALIZED`.
2. **Approve**: An authorized invoice approver reviews line items and selects **Approve** (or **Request Modification** with comments).
3. **Send (Dispatch)**:
   - Dispatches the invoice asynchronously.
   - Generates the standard **IATA IS-XML** file (`is-invoice.xsd`) and **PDF Invoice**.
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

- **Service Offerings**: Publish airport station capabilities so airlines can discover your ground handling services in the marketplace. Click **Edit** on existing offerings to update service descriptions and capabilities.
- **RFP Proposals**: View eligible RFPs, submit commercial rate proposals, and click **Edit Bid** to revise proposed rates and terms while the RFP remains open.
