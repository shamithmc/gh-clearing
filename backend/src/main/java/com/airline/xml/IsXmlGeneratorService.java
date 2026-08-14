package com.airline.xml;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Generates GHCP invoice XML from Invoice domain objects and validates it against
 * the bundled application-owned contract before returning. This validation does
 * not establish official IATA IS-XML conformance.
 */
@Service
public class IsXmlGeneratorService {

    /**
     * Generates an application-contract-validated XML byte array from an approved Invoice.
     *
     * @param invoice the approved Invoice domain object
     * @return UTF-8 encoded XML bytes
     * @throws XmlGenerationException if JAXB marshalling or XSD validation fails
     */
    public byte[] generate(Invoice invoice) {
        IsXmlInvoice xmlInvoice = mapToXmlModel(invoice);
        byte[] xmlBytes = marshal(xmlInvoice);
        validateAgainstSchema(xmlBytes);
        return xmlBytes;
    }

    private IsXmlInvoice mapToXmlModel(Invoice invoice) {
        IsXmlInvoice.Party supplier = IsXmlInvoice.Party.builder()
                .tenantId(invoice.getSupplierId())
                .name(invoice.getSupplierId())   // Use tenantId as name; enrich later from tenant registry
                .iataCode(invoice.getAirportCode())
                .build();

        IsXmlInvoice.Party buyer = IsXmlInvoice.Party.builder()
                .tenantId(invoice.getAirlineId())
                .name(invoice.getAirlineId())
                .iataCode(invoice.getAirlineId())
                .build();

        IsXmlInvoice.InvoiceHeader header = IsXmlInvoice.InvoiceHeader.builder()
                .invoiceNumber(invoice.getInvoiceNumber())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .currency(invoice.getCurrency())
                .exchangeRate(invoice.getExchangeRate())
                .supplier(supplier)
                .buyer(buyer)
                .build();

        AtomicInteger lineNum = new AtomicInteger(1);
        List<IsXmlInvoice.LineItem> xmlLineItems = new ArrayList<>();
        for (InvoiceLineItem item : invoice.getLineItems()) {
            IsXmlInvoice.FlightDetails flight = IsXmlInvoice.FlightDetails.builder()
                    .flightNumber(item.getFlightNumber())
                    .flightDate(item.getFlightDate())
                    .aircraftReg(item.getAircraftReg())
                    .departureAirport(item.getOrigin())
                    .arrivalAirport(item.getDestination())
                    .build();

            // Extract a representative quantity from quantityDrivers JSON (first numeric value)
            BigDecimal qty = extractFirstQuantity(item.getQuantityDrivers());

            xmlLineItems.add(IsXmlInvoice.LineItem.builder()
                    .lineNumber(lineNum.getAndIncrement())
                    .chargeCode(item.getChargeCode())
                    .serviceType(item.getServiceName())
                    .flightDetails(flight)
                    .quantity(qty)
                    .unitOfMeasure("UNIT")
                    .unitRate(BigDecimal.ONE)          // placeholder; full rate breakdown is in quantity drivers
                    .calculatedAmount(item.getCalculatedAmount())
                    .lineCurrency(invoice.getCurrency())
                    .build());
        }

        IsXmlInvoice.LineItems lineItems = IsXmlInvoice.LineItems.builder()
                .lineItemList(xmlLineItems)
                .build();

        IsXmlInvoice.InvoiceTotals totals = IsXmlInvoice.InvoiceTotals.builder()
                .totalAmount(invoice.getTotalAmount())
                .totalCurrency(invoice.getCurrency())
                .build();

        return IsXmlInvoice.builder()
                .version("1.0")
                .invoiceHeader(header)
                .lineItems(lineItems)
                .invoiceTotals(totals)
                .build();
    }

    private byte[] marshal(IsXmlInvoice xmlInvoice) {
        try {
            JAXBContext context = JAXBContext.newInstance(IsXmlInvoice.class);
            Marshaller marshaller = context.createMarshaller();
            marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, true);
            marshaller.setProperty(Marshaller.JAXB_ENCODING, "UTF-8");

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            marshaller.marshal(xmlInvoice, out);
            return out.toByteArray();
        } catch (JAXBException e) {
            throw new XmlGenerationException("Failed to marshal invoice XML: " + e.getMessage(), e);
        }
    }

    private void validateAgainstSchema(byte[] xmlBytes) {
        try {
            ClassPathResource xsdResource = new ClassPathResource("schema/is-invoice.xsd");
            SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
            try (InputStream xsdStream = xsdResource.getInputStream()) {
                Schema schema = factory.newSchema(new StreamSource(xsdStream));
                Validator validator = schema.newValidator();
                validator.validate(new StreamSource(new ByteArrayInputStream(xmlBytes)));
            }
        } catch (Exception e) {
            throw new XmlGenerationException("Generated invoice XML failed local contract validation: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the first numeric value from a JSON quantity drivers string.
     * e.g. {"passengers": 150} → 150
     */
    private BigDecimal extractFirstQuantity(String quantityDriversJson) {
        if (quantityDriversJson == null || quantityDriversJson.isBlank()) {
            return BigDecimal.ONE;
        }
        try {
            // Simple regex extraction of first numeric value in the JSON
            String stripped = quantityDriversJson.replaceAll("[^0-9.]", " ").trim();
            String[] parts = stripped.split("\\s+");
            for (String p : parts) {
                if (!p.isBlank()) {
                    return new BigDecimal(p);
                }
            }
        } catch (NumberFormatException ignored) {
        }
        return BigDecimal.ONE;
    }
}
