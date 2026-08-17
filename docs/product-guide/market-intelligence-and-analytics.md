# Market Intelligence and Analytics

Phase 8 delivers advanced market intelligence, competitive pricing benchmarks, and comprehensive financial and operational MIS reporting for both ground handlers and airlines.

## 1. Airport Cost Index

The **Airport Cost Index** aggregates and benchmarks average ground handling service costs across global airport hubs, regions, and aircraft categories.

```
Access: Airline Workspace → Cost Index (Airport Cost Index)
```

### Key Dimensions & Filters

- **Airport Hub**: Filter by ICAO / IATA station code (e.g. `DXB`, `LHR`, `SYD`, `JFK`).
- **Region**: Filter by global aviation region (e.g. `Middle East`, `Europe`, `Asia-Pacific`, `North America`).
- **Service Description**: Filter by ground handling service type (e.g. `Ramp Handling`, `Passenger Services`, `Baggage Handling`, `De-icing`, `Cargo & Mail`).
- **Aircraft Category**: Narrow by aircraft size (e.g. `Widebody (A380/B777)`, `Narrowbody (A320/B737)`, `Regional Jet`).
- **Operation Type**: Filter by `INTERNATIONAL` vs. `DOMESTIC` flight turnarounds.

### Commercial Confidentiality Barrier

To protect supplier pricing confidentiality and prevent market collusion or de-anonymization:

- The platform enforces an automated **Minimum 2-Supplier Threshold**: cost indices and average rates are only displayed for an airport station if **at least 2 independent ground handling suppliers** operate and bill at that station.
- If a station has only a single monopoly supplier, cost index metrics are withheld.

---

## 2. Pricing Benchmark

The **Pricing Benchmark** allows airline procurement directors to evaluate how their negotiated contract rates compare against the wider aviation market.

```
Access: Airline Workspace → Cost Index → Pricing Benchmark Panel
```

### Market Quartile Distribution

The benchmark groups contracted handling rates into three distinct market tiers:

- 🟢 **Top 25% (Competitive / Cost-Efficient)**: Contracted rates in the lowest quartile of the market, indicating favorable procurement pricing.
- 🟡 **Mid 50% (Market Standard)**: Contracted rates falling within the median standard range for the station and aircraft category.
- 🔴 **Bottom 25% (Premium / High Cost)**: Contracted rates in the highest quartile of the market, highlighting candidates for contract review or RFP renegotiation.

---

## 3. Airline MIS & Executive Dashboards

The **Airline Clearing** workspace provides four dedicated analytical panels on the **Airline Home** dashboard:

### AFR1 — Billed Amounts

- **Overview**: Monitors total billing volume dispatched by ground handling suppliers over time.
- **Breakdown**: Visualizes spending distribution across airport hubs and contracted service types.
- **Drill-Down**: Direct navigation to underlying invoice line items for detailed cost auditing.

### AFR2 — Expected Billing Projections

- **Overview**: Projects future monthly ground handling expenditures based on active contract terms and billing frequencies (per-flight, weekly, monthly, quarterly).
- **Variance Tracking**: Compares projected baseline expenditures against actual invoiced amounts to identify operational volume spikes.

### AOR1 — Contract Expiry Timeline

- **Overview**: Monitors the validity horizon of all active ground handling contracts.
- **Alert Windows**: Categorizes contracts expiring within **30 days**, **60 days**, or **90 days** to ensure procurement teams issue RFPs or renegotiate SLAs before contract lapse.

### AOR2 — Current Operational Footprint

- **Overview**: Interactive geographic map showing all airport stations where the airline operates.
- **Station Intelligence**: Hovering over airport pins reveals contracted ground handlers, active service types, monthly invoiced volume, and station SLA status.

---

## 4. Ground Handler MIS & Operational Dashboards

The **GH Clearing** workspace provides executive operational and financial visibility on the **Dashboard**:

### SFR1 — Receivables Summary & Aging

- **Outstanding Receivables**: Real-time balance of unpaid dispatched invoices across all airlines and stations.
- **Aging Analysis**: Categorizes receivables into aging buckets (`0–30 days`, `31–60 days`, `61–90 days`, `90+ days` overdue) to optimize treasury collections.

### SFR2 — Invoiced Amounts Trend

- **Monthly Billing History**: Bar chart displaying historical monthly billing totals.
- **Multi-Dimensional Filters**: Filter by Airline, Airport Hub, and Date Range to evaluate station commercial performance.

### SFR3 — Revenue per Flight

- **Yield Analysis**: Line chart tracking average billed revenue per handled flight turnaround over time across different aircraft categories and stations.

### SOR1 — Supplier Contract Expiry

- **Contract Governance**: Sortable table of contracts approaching expiration date with days remaining and renewal action triggers.

### SOR2 — Supplier Operational Footprint

- **Station Network**: Geographical map visualizing the ground handler's global station network, served airlines, and active ground handling service lines.

### SFR4 — Pending Invoicing

- **Unbilled Revenue**: Real-time calculation of operational flight turnarounds that have occurred and are due for billing based on contract frequency, but have not yet been included in an invoice draft.
- **Currency & Station Grouping**: Displays pending uninvoiced totals grouped by currency, airline customer, and airport station with a drill-down list of individual due flight turnarounds.
