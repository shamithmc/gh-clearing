# Marketplace and RFPs

The platform provides a structured procurement and RFP lifecycle between airlines and ground
handlers. Every listing, RFP, proposal, and decision is tenant-scoped and
filtered by the user's role and assigned dimensional boundaries.

## Ground-Handler Workflows

### Publish & Edit Service Offerings

Users with the RFP monitor role can publish services at configured operating
airports:

1. Open **Service Offerings**.
2. Select **Add Offering**.
3. Choose an **Operating airport** and **Service**.
4. Enter an offering description covering relevant capabilities, operating
   hours, equipment, or service strengths.
5. Select **Publish Offering**.

#### Edit an Existing Offering
To revise published capabilities or station descriptions:
1. Locate the offering in **Service Offerings**.
2. Click **Edit** (`data-testid="edit-offering-${id}"`).
3. Update the description or details in the modal and click **Save Changes**.
4. Updated information is immediately refreshed across airline marketplace searches.

#### Remove an Offering
To withdraw a listing, locate it in **Service Offerings** and select **Remove**.
Removing an offering withdraws it from marketplace discovery; it does not cancel
an existing active RFP or proposal.

### Review the RFP Summary

Open **RFP Summary** to see every RFP targeted to the ground handler and within
the user's airline, airport, and service scope. The summary retains eligible
RFPs after award or closure.

The summary cards show:
- **Received**
- **Responded**
- **Pending Decision**
- **Won**

Filter the list by airline, airport, response, or outcome. Expand a row to read
the airline's requirements and, after responding, the submitted terms.

Response values include `NOT_SUBMITTED`, `SUBMITTED`, `ACCEPTED`, and
`REJECTED`. Outcome values include `OPEN`, `PENDING_DECISION`, `WON`,
`NOT_SELECTED`, and `CLOSED`.

### Submit & Revise Proposals (Bids)

A ground handler can submit one proposal while an eligible RFP is
`PUBLISHED`:

1. Open **RFP Summary**.
2. Expand or review the RFP requirements and desired contract period.
3. Select **Submit Proposal**.
4. Enter a positive **Proposed rate**.
5. Select the proposal **Currency**.
6. Enter **Commercial and service terms**, including the rate basis, validity,
   payment terms, service levels, and exclusions as applicable.
7. Select **Submit Proposal**.

#### Revise Submitted Bid
If market conditions change or competitive terms need adjustment while the RFP is open:
1. Locate the submitted RFP in **RFP Summary**.
2. Click **Edit Bid** (`data-testid="edit-proposal-${id}"`).
3. Update the proposed rate, currency, or commercial SLA terms in the modal.
4. Click **Save Changes**. The airline's proposal review view immediately reflects the revised bid.

---

## Airline Workflows

### Discover Suppliers in the Marketplace

1. Open **Marketplace**.
2. Filter by region, airport, or service.
3. Review each supplier's airport, service, and capability description.
4. To start procurement from a listing, select **Initiate RFP**.

The application opens **RFPs** and pre-populates the listing's airport and
service. Complete the contract period and requirements before publishing.
Marketplace results include only eligible offerings within the airline user's
access scope.

### Publish & Edit an RFP

Users with the RFP raiser role can publish and edit RFPs:

1. Open **RFPs**.
2. Under **Create RFP**, select the airport and service type.
3. Select the desired contract period.
4. Describe volumes, operating hours, service levels, equipment, and other
   requirements.
5. Select **Publish RFP**.

#### Edit Published RFP
If service volumes, turnaround schedules, or contract periods change while the RFP is published:
1. Locate the RFP under **My Published RFPs**.
2. Click **Edit** (`data-testid="edit-rfp-${id}"`).
3. The form pre-fills all RFP parameters. Adjust requirements, dates, or specifications.
4. Click **Save Changes**.

### Compare and Decide Proposals

1. Under **My Published RFPs**, select **Review Proposals**.
2. Compare supplier, proposed rate, currency, commercial terms (including revised bids), and status.
3. Select **Reject** to reject an individual submitted proposal, or select
   **Award Contract** on the winning proposal.
4. Awarding an RFP automatically:
   - Sets the RFP to `AWARDED`
   - Sets the winning proposal to `ACCEPTED`
   - Sets all competing proposals to `REJECTED`
   - Generates a traceable **Draft Contract** for the winning supplier covering the agreed airport, service type, period, and rate basis.
