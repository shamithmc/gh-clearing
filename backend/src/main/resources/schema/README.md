# IATA IS-XML Schema Specification & Provenance Documentation

## Overview

This directory contains the XML Schema Definition (`is-invoice.xsd`) and provenance metadata (`is-invoice.provenance.json`) for generating and validating IATA IS-XML electronic invoices across the Airline Ground Handling Cost Management Platform.

---

## 1. Schema Provenance & Official Standard Reference

- **Official Standard**: IATA IS-XML Invoice Standard V4.4.0.0
- **Official Specification URL**: [IATA_IS_XML_Invoice_Standard_V4.4.0.0.xsd](https://www.iata.org/globalassets/iata/services/financial-services/sis/IATA_IS_XML_Invoice_Standard_V4.4.0.0.xsd)
- **Local Application Schema**: `backend/src/main/resources/schema/is-invoice.xsd`
- **Provenance Metadata File**: `backend/src/main/resources/schema/is-invoice.provenance.json`
- **Architectural Invariant Guard**: `INV-09` (*IATA IS-XML Compliance Guard*)

---

## 2. Design Rationale & Ground Handling Domain Mapping

The official 4,759-line IATA SIS schema (`IATA_IS_XML_Invoice_Standard_V4.4.0.0.xsd`) is designed for multi-invoice enterprise transmission batch files (`InvoiceTransmission`) sent directly to the IATA SIS clearinghouse.

To ensure fast in-memory JAXB marshaling, clean PDF rendering, and responsive email attachment dispatch, `is-invoice.xsd` is a **lean, self-contained application schema (`urn:iata:is:invoice:1.0`)** that extracts 100% of the Ground Handling (Miscellaneous) billing data fields:

### Field Alignment Table

| Category | Local Schema Element | IATA IS-XML V4.4 Equivalent | Description |
| :--- | :--- | :--- | :--- |
| **Root** | `<Invoice>` | `<Invoice>` (within `<InvoiceTransmission>`) | Single invoice root container |
| **Header** | `<InvoiceNumber>` | `<InvoiceNumber>` | Unique invoice identifier per tenant pair |
| **Header** | `<IssueDate>`, `<DueDate>` | `<InvoiceIssueDate>`, `<PaymentDueDate>` | Billing cycle dates |
| **Header** | `<Currency>` | `<InvoiceCurrencyCode>` | ISO 3-letter currency code (e.g. `AED`, `EUR`, `USD`) |
| **Header** | `<ExchangeRate>` | `<ExchangeRate>` | Mandatory decimal for cross-currency invoicing |
| **Parties** | `<Supplier>`, `<Buyer>` | `<BillingMember>`, `<BilledMember>` | Ground handler & airline tenant details (`TenantId`, `Name`, `IATACode`) |
| **Period** | `<ServicePeriod>` | `<BillingPeriod>` | Start and end date range of billed services |
| **Line Items** | `<LineItem>` | `<MiscInvoiceLineItem>` | Flight-level service line item |
| **Line Items** | `<ChargeCode>` | `<ChargeCode>` | IATA AHM560 & 25 standard ground handling charge codes |
| **Line Items** | `<ServiceType>` | `<ServiceType>` | Human-readable service name |
| **Line Items** | `<FlightDetails>` | `<FlightDetails>` | FlightNumber, FlightDate, AircraftReg, DepartureAirport, ArrivalAirport |
| **Line Items** | `<Quantity>`, `<UnitOfMeasure>` | `<BilledQuantity>`, `<UOM>` | Service quantity drivers and unit of measure |
| **Line Items** | `<UnitRate>`, `<CalculatedAmount>` | `<UnitPrice>`, `<LineItemAmount>` | Formula engine rate and calculated cost |
| **Totals** | `<InvoiceTotals>` | `<InvoiceSummary>` | Summed total amount and currency |

---

## 3. Validation & CI Integrity

During automated GitHub Actions CI pipeline execution (`validate_schema_provenance.py`):
1. Any modification to billing code or schema files triggers automatic provenance verification.
2. The SHA-256 digest of `is-invoice.xsd` must strictly match the hash declared in `is-invoice.provenance.json`.
3. `IataXmlComplianceTest.java` validates every generated invoice against `is-invoice.xsd` before transitioning status to `SENT`.
