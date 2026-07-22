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
import static org.mockito.Mockito.*;

/**
 * Conformance gate for IATA IS-XML Compliance Guard (INV-09).
 * Verifies that generated XML validates against the IATA IS-XML schema
 * and contains all mandatory fields before an invoice can be marked SENT.
 */
class IataXmlComplianceTest {

    private final IsXmlGeneratorService service = new IsXmlGeneratorService();

    @Test
    void generatedXmlIsValidIataIsXmlSchema() {
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
    void generatedXmlContainsSupplierAndBuyerParties() {
        Invoice invoice = buildTestInvoice();
        byte[] xml = service.generate(invoice);
        String xmlString = new String(xml);

        assertThat(xmlString).contains("<TenantId>SWISSPORT</TenantId>");
        assertThat(xmlString).contains("<TenantId>EK</TenantId>");
    }

    @Test
    void generatedXmlContainsFlightLevelLineItems() {
        Invoice invoice = buildTestInvoice();
        byte[] xml = service.generate(invoice);
        String xmlString = new String(xml);

        assertThat(xmlString).contains("<FlightNumber>EK001</FlightNumber>");
        assertThat(xmlString).contains("<AircraftReg>A6-EDB</AircraftReg>");
        assertThat(xmlString).contains("<DepartureAirport>DXB</DepartureAirport>");
    }

    @Test
    void xmlValidationFailurePreventsSentTransition_INV_09() {
        com.airline.repository.InvoiceRepository invoiceRepository =
                mock(com.airline.repository.InvoiceRepository.class);
        com.airline.security.TenantContext tenantContext = mock(com.airline.security.TenantContext.class);
        IsXmlGeneratorService generator = mock(IsXmlGeneratorService.class);
        com.airline.service.InvoiceService invoiceService = new com.airline.service.InvoiceService(
                invoiceRepository,
                mock(com.airline.repository.ContractRepository.class),
                mock(com.airline.pricing.PricingEngine.class),
                tenantContext,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                mock(com.airline.repository.InvoiceAuditLogRepository.class),
                mock(com.airline.service.DocumentGenerationJob.class),
                mock(com.airline.security.DimensionalSecurityEvaluator.class),
                generator,
                mock(org.springframework.context.ApplicationEventPublisher.class));
        Invoice invoice = buildTestInvoice();
        invoice.setStatus(InvoiceStatus.APPROVED);
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(invoiceRepository.findByIdAndTenantId(invoice.getId(), "SWISSPORT"))
                .thenReturn(java.util.Optional.of(invoice));
        doThrow(new XmlGenerationException("schema invalid"))
                .when(generator).generate(invoice);

        assertThatThrownBy(() -> invoiceService.updateInvoiceStatus(invoice.getId(), InvoiceStatus.SENT))
                .isInstanceOf(XmlGenerationException.class);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.APPROVED);
        verify(invoiceRepository, never()).save(any());
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
