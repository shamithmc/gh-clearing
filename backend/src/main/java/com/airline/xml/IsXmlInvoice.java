package com.airline.xml;

import jakarta.xml.bind.annotation.*;
import jakarta.xml.bind.annotation.adapters.XmlJavaTypeAdapter;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * JAXB-annotated root element for IATA IS-XML e-invoicing (IS P3 compliant).
 * Namespace: urn:iata:is:invoice:1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@XmlRootElement(name = "Invoice", namespace = "urn:iata:is:invoice:1.0")
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "InvoiceType", namespace = "urn:iata:is:invoice:1.0",
        propOrder = {"invoiceHeader", "lineItems", "invoiceTotals"})
public class IsXmlInvoice {

    @XmlAttribute(name = "version")
    private String version = "1.0";

    @XmlElement(name = "InvoiceHeader", namespace = "urn:iata:is:invoice:1.0", required = true)
    private InvoiceHeader invoiceHeader;

    @XmlElement(name = "LineItems", namespace = "urn:iata:is:invoice:1.0", required = true)
    private LineItems lineItems;

    @XmlElement(name = "InvoiceTotals", namespace = "urn:iata:is:invoice:1.0", required = true)
    private InvoiceTotals invoiceTotals;

    // ── Nested Types ──────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "InvoiceHeaderType", namespace = "urn:iata:is:invoice:1.0")
    public static class InvoiceHeader {

        @XmlElement(name = "InvoiceNumber", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String invoiceNumber;

        @XmlElement(name = "IssueDate", namespace = "urn:iata:is:invoice:1.0", required = true)
        @XmlJavaTypeAdapter(LocalDateAdapter.class)
        @XmlSchemaType(name = "date")
        private LocalDate issueDate;

        @XmlElement(name = "DueDate", namespace = "urn:iata:is:invoice:1.0", required = true)
        @XmlJavaTypeAdapter(LocalDateAdapter.class)
        @XmlSchemaType(name = "date")
        private LocalDate dueDate;

        @XmlElement(name = "Currency", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String currency;

        @XmlElement(name = "ExchangeRate", namespace = "urn:iata:is:invoice:1.0")
        private BigDecimal exchangeRate;

        @XmlElement(name = "Supplier", namespace = "urn:iata:is:invoice:1.0", required = true)
        private Party supplier;

        @XmlElement(name = "Buyer", namespace = "urn:iata:is:invoice:1.0", required = true)
        private Party buyer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "PartyType", namespace = "urn:iata:is:invoice:1.0")
    public static class Party {

        @XmlElement(name = "TenantId", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String tenantId;

        @XmlElement(name = "Name", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String name;

        @XmlElement(name = "IATACode", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String iataCode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "LineItemsType", namespace = "urn:iata:is:invoice:1.0")
    public static class LineItems {
        @XmlElement(name = "LineItem", namespace = "urn:iata:is:invoice:1.0", required = true)
        private List<LineItem> lineItemList;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "LineItemType", namespace = "urn:iata:is:invoice:1.0")
    public static class LineItem {

        @XmlElement(name = "LineNumber", namespace = "urn:iata:is:invoice:1.0", required = true)
        private int lineNumber;

        @XmlElement(name = "ChargeCode", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String chargeCode;

        @XmlElement(name = "ServiceType", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String serviceType;

        @XmlElement(name = "FlightDetails", namespace = "urn:iata:is:invoice:1.0")
        private FlightDetails flightDetails;

        @XmlElement(name = "Quantity", namespace = "urn:iata:is:invoice:1.0", required = true)
        private BigDecimal quantity;

        @XmlElement(name = "UnitOfMeasure", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String unitOfMeasure;

        @XmlElement(name = "UnitRate", namespace = "urn:iata:is:invoice:1.0", required = true)
        private BigDecimal unitRate;

        @XmlElement(name = "CalculatedAmount", namespace = "urn:iata:is:invoice:1.0", required = true)
        private BigDecimal calculatedAmount;

        @XmlElement(name = "LineCurrency", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String lineCurrency;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "FlightDetailsType", namespace = "urn:iata:is:invoice:1.0")
    public static class FlightDetails {

        @XmlElement(name = "FlightNumber", namespace = "urn:iata:is:invoice:1.0")
        private String flightNumber;

        @XmlElement(name = "FlightDate", namespace = "urn:iata:is:invoice:1.0")
        @XmlJavaTypeAdapter(LocalDateAdapter.class)
        @XmlSchemaType(name = "date")
        private LocalDate flightDate;

        @XmlElement(name = "AircraftReg", namespace = "urn:iata:is:invoice:1.0")
        private String aircraftReg;

        @XmlElement(name = "DepartureAirport", namespace = "urn:iata:is:invoice:1.0")
        private String departureAirport;

        @XmlElement(name = "ArrivalAirport", namespace = "urn:iata:is:invoice:1.0")
        private String arrivalAirport;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "InvoiceTotalsType", namespace = "urn:iata:is:invoice:1.0")
    public static class InvoiceTotals {

        @XmlElement(name = "TotalAmount", namespace = "urn:iata:is:invoice:1.0", required = true)
        private BigDecimal totalAmount;

        @XmlElement(name = "TotalCurrency", namespace = "urn:iata:is:invoice:1.0", required = true)
        private String totalCurrency;
    }
}
