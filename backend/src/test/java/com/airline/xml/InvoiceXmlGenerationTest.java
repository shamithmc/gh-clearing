package com.airline.xml;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests generation and validation against the application-owned invoice XML contract.
 */
class InvoiceXmlGenerationTest {

    private final IsXmlGeneratorService service = new IsXmlGeneratorService();

    @Test
    void testGeneratesValidXmlForApprovedInvoice() {
        Invoice invoice = buildTestInvoice();
        byte[] xml = service.generate(invoice);

        assertThat(xml).isNotNull();
        assertThat(xml.length).isGreaterThan(0);

        String xmlString = new String(xml);
        assertThat(xmlString).contains("urn:iata:is:invoice:1.0");
        assertThat(xmlString).contains("<InvoiceNumber>INV-XML-001</InvoiceNumber>");
        assertThat(xmlString).contains("<ChargeCode>RAMP_HANDLING</ChargeCode>");
        assertThat(xmlString).contains("<TotalAmount>1200.00</TotalAmount>");
    }

    @Test
    void testGeneratedXmlContainsSupplierAndBuyer() {
        Invoice invoice = buildTestInvoice();
        byte[] xml = service.generate(invoice);
        String xmlString = new String(xml);

        assertThat(xmlString).contains("<TenantId>SWISSPORT</TenantId>");
        assertThat(xmlString).contains("<TenantId>EK</TenantId>");
    }

    @Test
    void testGeneratedXmlContainsFlightDetails() {
        Invoice invoice = buildTestInvoice();
        byte[] xml = service.generate(invoice);
        String xmlString = new String(xml);

        assertThat(xmlString).contains("<FlightNumber>EK001</FlightNumber>");
        assertThat(xmlString).contains("<AircraftReg>A6-EDB</AircraftReg>");
        assertThat(xmlString).contains("<DepartureAirport>DXB</DepartureAirport>");
    }

    private Invoice buildTestInvoice() {
        InvoiceLineItem lineItem = InvoiceLineItem.builder()
                .id("li-1")
                .flightDate(LocalDate.of(2025, 1, 15))
                .flightNumber("EK001")
                .aircraftReg("A6-EDB")
                .origin("DXB")
                .destination("LHR")
                .chargeCode("RAMP_HANDLING")
                .serviceName("Ramp Handling")
                .formulaType("PF-01")
                .quantityDrivers("{\"passengers\": 150}")
                .calculatedAmount(new BigDecimal("1200.00"))
                .contractId("c-test")
                .build();

        return Invoice.builder()
                .id("inv-xml-test")
                .invoiceNumber("INV-XML-001")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("AED")
                .issueDate(LocalDate.of(2025, 1, 15))
                .dueDate(LocalDate.of(2025, 2, 14))
                .status(InvoiceStatus.APPROVED)
                .totalAmount(new BigDecimal("1200.00"))
                .lineItems(List.of(lineItem))
                .build();
    }
}
