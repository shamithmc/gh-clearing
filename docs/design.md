# Conceptual & Design Document - Airline Ground

# Handling Cost Management Platform

We envisage building a platform that could be used by airline ground handling service providers
to invoice airlines in industry standard IATA formats ( Level - 1). Once the platform has a
critical mass of suppliers, the same could be used by airlines to get a market view of the cost
prevalent in different airports for different services ( Level - 2). If the airline is cooperative, this
could be morphed into a full fledged invoicing & dispute management system ( Level - 3).

## Business Need / Gap

1. Ground handling industry has only a few large scale players. Most of the suppliers
    provide services only on a regional basis for a few airports or for a few services. These
    providers lack sophisticated invoicing systems by and large. Most of the international
    airlines have specialized invoice processing systems that are geared up to handle
    industry standard IATA XML standards. By and large very few ground handlers provide
    invoices in IATA XML format. They invoice the airlines in PDF / paper
2. All the large airlines spend a lot of time converting these PDF invoices into electronic
    readable formats and verifying these invoices. Consequently, the payments to these
    ground handlers are largely delayed. If the invoices are in IATA XML formats, the
    processing of these for the airlines is straight through. It is a win-win situation for both
    airlines & ground handlers. For airlines , there is less human cost in processing these
    invoices. For ground handlers, the timely payment would be issued - resulting in better
    cash-flows
3. While the same XML standards are applicable for all the operating cost types of airlines (
    Fuel , Landing & Parking, Overflying , Hotels ) , ground handling is what you can classify
    as a ‘long tail’ industry. The market share of the dominant players in industry is very less
    compared to fuel. The other cost types have the following challenges
       a. Overflying ( civil aviation authorities are the service providers, which are the
          vendors ). Large number of authorities especially in Europe are IATA XML
          compliant.
       b. Landing & Parking ( airports are the providers - but the invoicing is dependent on
          landing and parking timings - which are only available in their internal systems ).
          Few airports of late ( LHR , MUC , FRA ) have adopted the IATA XML standards
          with encouraging results
       c. Hotels ( This is another possible segment - But airlines are not the ‘bread and
          butter’ of hotels unlike ground handlers )


4. Because of the small nature of ground handlers, and their lack of invoicing systems, they
    too lack proper analytics on the cost base. The following questions typically puzzle them
    a lot
       a. What is the appropriate price to charge at a particular airport for a type of service
          (baggage handling / checkin counters etc )?
       b. Is my pricing at a premium level or discount level?
       c. What is my market share in a region or airport for a type of service?
       d. What exactly is my revenue base service-wise?
    Addressing many of these questions require having a critical mass of ground handlers
    and airlines in a region using this platform. This also would need us to carefully decide
    what data can we showcase. However, these are not immediate concerns
5. IATA Clearing House (ICH) - This is a mechanism by IATA in which you can mutually
    interact with other airlines & suppliers in a clearing-house manner. All international
    airlines are by default part of that ( because of interline billing and settlement ). This is a
    great place for suppliers to get into if you are in a ‘net-receivable’ situation. When you
    invoice through ICH, airlines are bound to issue you immediate settlement without
    waiting for clearing issues / resolving issues etc. One amongst the many conditions for a
    ground handler to enter this is invoicing in IATA XML. Very few ground handlers are part
    of this
6. For airlines also, accurately estimating ground handling costs is a big challenge. When
    an airline is evaluating flights to a new airport, estimating the ground handling cost base
    in that airport is very difficult. The following questions puzzle airlines a lot
       a. What is the ground handling cost going to be in an airport?
       b. Am I paying a premium price or discounted price at an airport?
       c. Who are the potential service providers in a new airport?
7. Dispute Management. Today, all disputes between an airline & ground handler is done
    over email / phone etc. This results in no audit trail / easy tracking of claims etc. The
    platform , on successful participation from airline as well as a number of ground handlers
    can be used to manage disputes in a structured way

## Business Design of the Platform

**(Level - 1)**
In this mode ( which is the base level needed for go- live) , the platform is driven entirely by the
ground handler. Ground handler do three things mainly in this platform
(i) Enter & Maintain Contracts (ii) Enter Invoice Data (iii) Send Invoice to the airline in IS XML /
PDF (iv) Mark which one of the invoice is settled ( tick box ) (iv) Consume the limited MIS -
which is supplier specific information at this stage


The main challenges in getting into this stage

(i) We need to begin from zero
(ii) Convincing small ground handlers, pilot with them and make the product perfect
(iii) If big suppliers become interested, GDS ( flight data) integration

**(Level - 2 )**

In this mode, the airline also participates in the platform in the form of reviewing & approving
contracts, requesting ground handlers for a proposal. Airlines can see the market intelligence in
an airport / region provided a sufficient number of suppliers become part of this. An airline can
mark invoices as paid from their side in this ( this will add more meaning to the MIS ). An
interface from various payment channels to the platform to get the paid status is too complex &
diverse. So, not thinking about that now


In this level, there is more engagement from the airline. The idea is to drive this as a genuine
‘two-sided platform’ between airline & ground handler. Airline can initiate an RFP for a service in
an airport , request review of a service contract to the ground handler. Before getting into this
stage, the ground handler should be fully on-board with this system

**Challenges**

(i) For an airline to get into this platform for active collaboration with the ground handler, there
should be a sizeable number of ground handlers who are using this platform. An airline won’t
follow a process for a few ground handlers

(ii) Airlines are typically large organizations & slow to drive process change initiatives.

**Level - 3**

Level - 2 above plus dispute management. Airline will review the invoice data in the platform,
for charges they see as incorrect , they will ‘ mark for dispute’ with appropriate reason ,
comments & justifying materials as attachments, raise a dispute. Supplier can put it back to the


airline with justification & materials, Airlines can put it back to them. On successful ‘dispute
acceptance’ by a ground handler, they will raise a ‘credit note’ ( system should automatically
facilitate that based on the accepted disputes ). The credit note will offset the open disputes
that are accepted ( again IATA XML format )

**Challenges**

This requires good close coordination & working between the airline & ground handler. Only one
player cannot drive this. Before even attempting this, the critical mass supplier - airline
combinations should be in Level - 2

At this level, we definitely need GDS integration. As a sizeable number of airlines - ground
handlers come into this this level, we cannot afford to have an entirely manual keying in of flight
details throughout.

## IATA, ICH, IATA XML

IATA or International Air Transport Association is a confederation of Airlines & Airline related
businesses. This is not a legal - body per se. But airlines use IATA as a front face to lobby
governments / other industries etc for their benefits. IATA issues standards & guidelines to
make mutual interaction & business in aviation industry smooth

IATA has engaged airlines in many aspects for a long time. The revenue side of international
airlines ( Fares , tickets , proration , interline , codeshare etc ) is heavily driven by the IATA
standards. However, the cost-side is not that much influenced by IATA. IATA XML / IS-XML / is
a major attempt by IATA to standardize the cost management functions of aviation industry.

IATA IS XML is a standard that IATA has setup ( not enforced as it cannot legally do so ) to
make mutual financial interaction ( inter airline billing / airline - supplier transactions etc)
smooth.

IATA clearing house(ICH) is a netting mechanism ( A owes B $100 , B owes C $80 , C owes A
$10 ⇒ Can be netted off to A paying C $70 ) with all interacting airlines & service providers. It
is not easy for a small scale ground handler to get into this. It has lots of criteria ( one of it is
supporting IATA XML ) for membership. The important point about clearing house is that, once
an invoice is submitted into the clearing house, the participant is supposed to get the settlement
as per the due date. An airline cannot hold the payment citing a dispute. Disputes are to be
raised separately. The principle is ‘pay-first, dispute later’. Of-course, if the volume of disputes
is too large, IATA may very well kick out the participant from it.

The IATA IS XML standard is available here
https://www.iata.org/services/finance/financial/Documents/IS-XML_e-invoicing_standard_Ground_Handlers.pdf


This is yet to be assessed fully from a technical perspective. So, at this point we are unsure of
any technical challenges for this XML generation / transmission. All the standards for this is
open source. And changes keep coming in this driven by IATA.

There are similar XML standards for Fuel / Landing & Parking / Overflying etc

IATA XML groups different ground handling services into a finite set of charge codes given
below.

**_Baggage, Baggage Delivery,Cargo Handling, Catering,Cleaning, Commission, Crew
Accomodation, Crew Transportation,Customs Service Charge,Deicing,Departure
Stamps,Immigration Fines, Lounges, Misc , Mishandling baggage, Mishandling
Passenger,Motor Fuel, Passenger Handling, Passenger Transportation,Passenger
Security,Ramp Handling,Rent Equipment,Stand, STPC,Utilities_**

So, when you define a contract, you are basically defining a service which maps into one of the
charge codes above. You can name the service as anything. But it should be mapped into one
of these charge codes so that XML generation is possible

## Ground Handling Contracts

Ground Handling Contracts could be one among the below types

1. Unit Rate Based ( Rate * Qty )
    a. This quantity could be anything ( ramp, aerobridge , baggage handlers, checkin
       counters, de-icing fluid, baggage containers , blankets for passengers,..... ) ..
       This is a big list. And it cannot be fully defined. Consequently from a design
       perspective, this has to be a user defined field
    b. Quantity could even be a product of two ( checkin counters * hours of operation )
2. Slab based Type - 1
    a. Upto 3 wheelchairs in a flight $3, 3 - 5 Wheelchairs $5 etc
3. Slab based type - 2
    a. Upto 3 wheelchairs in a flight 0, if you choose 4th wheelchair entire qty ( 4* rate )
4. Time based rate
    a. Till 5 PM $100 per checkin counter per hour. 5PM - 10 PM $150 etc
5. Day / month based rates ( Aerobridge charges are higher in the weekend )
6. Certain rates ( basic handling charges for eg ) are dependent on the MTOW ( Maximum
    TakeOff weight ) of an aircraft. This is specific for an airline. For eg, the MTOW of an
    A380 of SQ ( Singapore Airlines ) is different from MTOW of A380 of Etihad (EY).
    Certain ground handlers charge it by taking an industry reference MTOW rate. We may
    need to think about how to capture it. Every aircraft has a unique ‘Tail ID’ ( Registration


```
number equivalent ). We may need to maintain a self-updating list of tail number,
reference industry weights, actual MTOW etc
```
## Supplier MIS

The idea of detailing the supplier MIS is that, while we design this, we should consider
the data requirements & architect in such a way that deriving these MIS is easy from a data &
reporting perspective. The MIS is not an exhaustive one.This list is rather indicative

### Supplier Financial Summary

```
Report Identifier SFR1 ( Will reference this in wireframes )
```
```
Report Description Supplier Receivables Summary - This gives the summary of
outstanding receivables of a supplier from different airlines & airport
```
```
Visualizations Pie Chart giving airport-wise & airline-wise share of outstanding
receivables for a ground handler. Dimensions - airline, airport ,
country , regional classification of airports & airlines specific to a
supplier, currency , aircraft type
```
```
Aging of receivables ( sysdate - invoice date ) ⇒ also analyzed by
the above dimensions
```
```
Another visualization would be a trend of absolute amount of
receivables trending over the last few months ( might be difficult as
this would mean storing ‘as-of date’ data )
```
```
Drill down To the actual numerical data of invoices
```
```
Level at which this
would be a value add
```
```
Level - 1 itself
```

**Report Identifier** SFR

**Report Description** Invoiced Amount airport & airline-wise

**Visualizations** Bar graph of invoiced amount trending month-wise ( Dimensions -
airport , airline , regional classification , supplier specific classification
of airline , aircraft type, currencies

**Drill down** Drill down to the invoices

**Level Level - 1**

**Report Identifier** SFR

**Report Description** Revenue per invoiced Flight ( airline -wise & airport-wise & service
type-wise )

**Visualizations** Line graph ( dimensions - aircraft , airport , airline , regional
classification , supplier specific classification of airline )

**Drill Down** Nil

**Level** Level - 1

**Report Identifier** SFR

**Report Description** Amount waiting to be invoiced

**Visualizations** Pie-chart ( Airport , airline , regional classification , supplier specific
classification of airline ). Based on billing frequency , operational data (
GDS ) & contracts - we can calculate amounts that are yet to be
invoiced

**Drill down** To be invoiced amounts - airline , aircraft, service type wise etc

**Level** Level - 2 / 3 ( May need GDS interface )


### Supplier Operations Summary

```
Report Identifier SOR
```
```
Report Description Contracts up for Expiry
```
```
Visualizations Tabular ( Airline, Airport, Service Type , days before expiry ).
Visualization with graphs will be more relevant once big value
suppliers use this.
```
```
Drill Down Nil
```
```
Level Level -
```
```
Report Identifier SOR
```
```
Report Description Operational Footprint
```
```
Visualization Map with dropdowns as Airline, Service Type
```
```
Drill Down Contract Summary & SFR
```
```
Level Level - 2 / 3 ( makes sense only for global players )
```
```
Report Identifier SOR
```
```
Report Description Review & Request for Proposals. This gives the summary of
contract review requests & request for proposal of a service at xyz
airport from an airline
```
```
Visualization Tabular. Map view when you reach level - 3
```
```
Drill downs Proposal Details ( tabular )
```
```
Level Level - 2 / 3
```
### Dispute Summary


```
Report Identifier SDR
```
```
Report Description A bit too early to think about this. This report should give a summary
of disputes raised by airline ( 4/5 types of disputes - operational data
mismatch , contract rate/formula mismatch, Exchange Rate mismatch
, referenced flight does not belong to us, misc )
```
```
VIsualization Can be a pie chart based on the value of disputed line item. Tabular
view is also essential
```
```
Drill Downs Disputed line item & invoice details
```
```
Level Level - 3
```
## Airline MIS

This section details different reports / visualization that are relevant for an airline. Applicable
only from Level -2 & 3

### Airline Financial Summary

```
Report Identifier AFR
```
```
Report Description Amounts billed by so and so suppliers, airport-wise , service-wise.
Can show unpaid & total
```
```
Visualization Pie-chart & bar-graph.
```
```
Drill down Drill down into billed invoice details
```
```
Level Level - 2
```
```
Report Identifier AFR
```
```
Report Description Expected Billing Amounts ( based on billing frequency )
```
```
Visualization Line Graph ( Day vs Amounts ) - Airport-wise , service-wise &
supplier-wise, currency-wise
```

```
Drill-down Drill down into expected amounts
```
```
Level Level - 2 /
```
**Airline Operations Summary**

```
Report Identifier AOR
```
```
Report Description Contracts Up for Expiry in so many days
```
```
Visualization Tabular. Maybe a map-based airport-wise
```
```
Drill Down Nil
```
```
Level Level 2
```
```
Report Identifier AOR
```
```
Report Description Current Footprint ( Airports & Services )
```
```
Visualization Map. On hovering in the map on an airport, services & suppliers
could be highlighted with monthly rates & invoiced values
appearing on mouseover.
```
```
Drill down Contracts , invoice summary
```
```
Level Level 2
```
```
Report Identifier AOR
```
```
Report Description Request for Review summary
```
```
Visualization Tabular. Airport-wise,service-wise & supplier-wise requests that has
come for review of contracts
```
```
Drill Down Nil
```
```
Level Level - 2
```

### Airline Dispute Summary

```
Report Identifier ADR
```
```
Report DEscription Dispute summary. Similar to SDR1 , but from an airline perspective
```
```
Visualization Tabular. Map-view / pie-view when the operations grow
```
```
Drill-down To the disputed line items
```
```
Level Level-
```
### Airport Cost Index

As it was detailed earlier, one of the most perplexing questions that route planners often
encounter is, what is the handling cost going to be in so and so airport. There is an element of
confidentiality here as suppliers won’t like all of their data to be published outside. However, we
can very well publish an aggregated index. Assuming there are 2 / 3 service providers in an
airport who uses our platform, publishing an aggregate rate at an airport / region level is not a
breach of confidentiality ideally

Cost per service type - dimensions - aircraft type , international , domestic etc

### Airport service Provider’s market

This is supplier’s gateway to market their offering to an airline. On giving this view to the airline,
if a supplier uses our services at an airport, those services will be listed as services available.
Airlines can initiate request for proposal from this

This can also show to an airline, whether their existing rates are at a premium / discount when
considering other suppliers in the region. For eg, calculate the unit rate of all services for all
airlines, just publish whether this particular airlines unit rate is in the top-25% / Mid 50 % /
bottom 25% ( dimension - aircraft type )

**_(We need to debate a lot on the confidentiality aspect before we chose to do this -
However these things are largely applicable at Level - 2 & 3 )_**


## Roles & Responsibilities

All the distinct Roles & Responsibilities that the platform should support is provided here. One
user can have two or more roles

### Ground Handler Roles

(service type/charge code as a restrictive dimension is not mandatory. More of a wish list)

```
Role Name Description Restrictive Dimensions
```
```
Contract Entry One who enters the contracts Airports , Airlines , Service Type
```
```
Admin One who sets
supplier-specific parameters,
assigns user specific roles etc
```
```
Contract
Review &
Approve
```
```
One who reviews & approves
the entered contracts
```
```
Airport, Airlines,Service Types
```
```
Invoice Entry One who keys in operational
data for invoices
```
```
Airport, Airlines & Service types
```
```
Invoice
Approver
```
```
One who approves & submits
the invoice for sending to
airline
```
```
Airport , Airline , Service Types
```
```
MIS view Access to MIS views Airport , Airline, Service Types
```
```
RFP monitoring
& Response
```
```
Ability to monitor & respond to
RFPs from airlines
```
```
Airport, Airline & service Type
```
```
Invoice Status
Updation
```
```
Updating whether an invoice
is paid or not
```
```
Airport, Airline & service Type
```
```
Dispute
Handler
```
```
Ability to accept & respond to
dispute, ability to request a
credit note
```
```
Airport, Airline, Service TYpe
```
```
Dispute
approver
```
```
One who authorizes credit
notes for airlines
```
```
Airport, Airline, Service Type
```

### Airline Roles

```
Role Description Restrictive Dimensions
```
```
INvoice Review Ability to view invoices Airport , Service Type
```
```
Invoice Disputer Ability to raise dispute & close it Airport , Service Type
```
```
Contract View Ability to view airline specific contracts. Airport, Service TYpe
```
```
Contract Review Ability to raise a review request, Airport, Service TYpe
```
```
RFP raise ability to raise RFP Airport, Service Type
```
```
MIS Ability to see various MIS dashboards Airport, Service Type
```
```
Update Paid
status
```
```
Can update a paid status for an invoice Airport, Service Type
```
_Note: We may need to restrict access of various reports in the previous sections to specific
airlines / suppliers. Many of the reports make sense only if you have enough data. So a report
level access restriction specific to a customer of the platform is desirable. We may chose to do a
pricing based on that as well_

## User - Stories

### Ground Handler Contracts Entry

1. User clicks New Contract
2. Picks an Airline & Airport ( Enabling an airline & airport for a ground handler is our job -
    depends on payment )
3. Select a service Type ( One among the IATA Charge codes ) & billing frequency (
    optional )
4. Enter From date - to Date
5. Enter a service name ( supplier specific name )
6. Pick a currency
7. Pick a formula type ( Refer the contracts section for different types of formulas )


8. The screen should render based on the formula chosen
9. Enter the rates, formula details if applicable , quantity driver & unit of measure (s) - The
    quantity driver ( wheelchairs, check-in counters , deicing liquid ) , will be visible when
    they key in the operational data for invoicing
10.Tax codes / rates applicable ( again this could be tricky - need to study the iata xml
    properly to understand how that works
11.Save , Review with summary pops up
12.Submit

### Ground Handler Contracts Approve

1. Contracts summary screen ( airport , airline-wise )
2. page filters - waiting for approvals, approved, expired
3. Click view summary ( should popup a summary of the contract with an approve button)
4. On Approval, the contract is finalized
5. Another button ‘mark for review’ with comments field - which would prompt the contract
    entering person to review it

### Invoice Entry

1. Create New Invoice ( Pick Airline & Airport )
2. Pick service(s) - An invoice can have multiple services. Each service belongs to a
contract
3. On clicking next, system should prompt the user to enter the invoice header

Header Fields are as follows
(a)Invoice Date ( Ideally this should be the system date. But most suppliers enter this a few
days before. This should ideally be controlled by a supplier specific parameter.. Can
become important if this reaches Level - 2 / 3 with active participation of airlines. Airlines
simply hate supplier pre-dating the invoices. Their payment terms are based on invoice
date. Hence if a supplier pre-dates it, it is problematic for airlines from a cash flow
perspective
(b)Invoice Number ( user enterable unique name - alphanumeric- per airline ground
handler )
(c)Invoice currency. ( Invoicing should ideally be in the contract currency. However in a few
situations, supplier may enter invoices in a different currency. In such cases, an
exchange rate field should become mandatory ... When we reach level-2/ 3 we may
need to build the capability of taking a feed of bloomberg/reuters exchange rate into the
platform
(d)Invoice header total ( can be set to auto-calculate as a total based on the lines )
(e)Invoice Due Date ( later on we can try to build a payment terms logic - but at this point, a
keyed in date field will do )


```
(f) Invoice From Date & To date ( flight dates )
(g)Any other fields that may become mandatory after studying the IATA XML standard
```
For every service picked up, A set of lines should open up which allows user to key in the flight
details which include
(a)Date (b) Flight Number © Aircraft registration (d ) Dep (e) Destination (f) quantity drivers

- some of this will be mandatory , some are not.. Need to study the xml properly to
    understand those
- On entering the quantity drivers, system should auto calculate & populate the cost at a
    line level
- If a GDS integration is present ( Level 2 / 3) , on entering the date ranges & some other
    parameter, system should automatically query & display the flights - which can be
    changed by user later

Save - Should validate & display the summary. Finalize - invoice entering person has
submitted it

An invoice which is sent to supplier cannot be edited / changed. Till that point users should be
able to change it.

From approver role,

User should be able to review it..

```
(1)Mark for modification with comments
(2)Approve it
(3)Send it to the relevant mail ID’s ( mail ID should be part of a ground handler - supplier
specific setup )
(4)Mark a sent invoice as Paid
(5)Mark a sent invoice as disputed ( In Level 3 you could have a more sophisticated
mechanism ) with comments
```
## Wireframes ( All at Level - 1 )

```
1) Landing Page for Ground Handler
```

2) Contracts - Landing page


3) Contracts Airline View


4) Contracts List ( on selecting airline & airport )


5) Contract Entry


### Invoice Entry



