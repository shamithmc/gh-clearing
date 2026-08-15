# Marketplace and RFPs

Phase 7 provides a structured procurement workflow between airlines and ground
handlers. Every listing, RFP, proposal, and decision is tenant-scoped and
filtered by the user's role and assigned dimensions.

## Ground-handler workflows

### Publish a service offering

Users with the RFP monitor role can publish services at configured operating
airports:

1. Open **Service Offerings**.
2. Select **Add Offering**.
3. Choose an **Operating airport** and **Service**.
4. Enter an offering description covering relevant capabilities, operating
   hours, equipment, or service strengths.
5. Select **Publish Offering**.

The airport must be configured for the ground handler, and the airport and
service must be within the user's access scope. Published offerings become
discoverable to eligible airlines.

To withdraw a listing, locate it in **Service Offerings** and select **Remove**.
Removing an offering removes it from marketplace discovery; it does not cancel
an existing RFP or proposal.

### Review the RFP summary

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

### Submit a proposal

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

After submission, the row shows the proposed rate and no longer offers another
proposal action. Monitor **Response** and **Outcome** for the airline's
decision.

## Airline workflows

### Discover suppliers in the marketplace

1. Open **Marketplace**.
2. Filter by region, airport, or service.
3. Review each supplier's airport, service, and capability description.
4. To start procurement from a listing, select **Initiate RFP**.

The application opens **RFPs** and pre-populates the listing's airport and
service. Complete the contract period and requirements before publishing.
Marketplace results include only eligible offerings within the airline user's
access scope.

### Publish an RFP

Users with the RFP raiser role can publish an RFP:

1. Open **RFPs**.
2. Under **Create RFP**, select the airport and service type.
3. Select the desired contract period.
4. Describe volumes, operating hours, service levels, equipment, and other
   requirements.
5. Select **Publish RFP**.

The RFP is sent only to ground handlers configured for both the airline and
selected airport. The confirmation reports the number of eligible ground
handlers. A published RFP appears under **My Published RFPs**.

### Compare and decide proposals

1. Under **My Published RFPs**, select **Review Proposals**.
2. Compare supplier, proposed rate, currency, commercial terms, and status.
3. Select **Reject** to reject an individual submitted proposal, or select
   **Accept & Create Draft** for the preferred proposal.

Accepting a proposal:

- changes the proposal to `ACCEPTED`;
- changes the RFP to `AWARDED`;
- rejects remaining submitted proposals; and
- creates one traceable draft contract owned by the selected ground handler.

The new contract is a draft. It must follow the normal contract review and
approval workflow before it can be used for invoicing.

## Track contract-review requests

Airline users with the contract-review role can open **Review Requests** to
track sent requests. Summary cards cover request, supplier, airport, and
service counts. Filters are available for supplier, airport, service, and
contract status.

The table shows when the request was sent, the supplier, airport, services,
contract reference, current contract status, requester, and comment. The
status reflects the related contract's current status.

## Access and visibility notes

- Airline RFP users are restricted by airline tenant, airport, and service.
- Ground-handler RFP users are restricted by supplier tenant, airline,
  airport, and service.
- A supplier sees only RFPs explicitly targeted to it.
- An airline evaluates only proposals submitted to its own RFP.
- A marketplace listing does not guarantee that a proposal will be accepted.
- If expected data is missing, clear filters and verify role and dimensional
  assignments with an administrator.
