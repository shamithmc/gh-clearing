package com.airline.xml;

import com.airline.domain.CreditNote;
import com.airline.domain.Dispute;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;

/**
 * Generates and validates the platform credit-note interchange document.
 *
 * <p>The namespace deliberately identifies the local application contract. It must
 * not be represented as official IATA IS-XML until the separately governed,
 * licensed IATA schema is installed and verified.</p>
 */
@Service
public class CreditNoteXmlGeneratorService {
    static final String NAMESPACE = "urn:ghcm:credit-note:1.0";

    public byte[] generate(CreditNote note, Dispute dispute) {
        try {
            DocumentBuilderFactory documents = DocumentBuilderFactory.newInstance();
            documents.setNamespaceAware(true);
            documents.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document document = documents.newDocumentBuilder().newDocument();
            Element root = document.createElementNS(NAMESPACE, "CreditNote");
            root.setAttribute("version", "1.0");
            document.appendChild(root);

            append(document, root, "CreditNoteNumber", note.getCreditNoteNumber());
            append(document, root, "OriginalInvoiceNumber", note.getOriginalInvoiceNumber());
            append(document, root, "DisputeNumber", dispute.getDisputeNumber());
            append(document, root, "IssueDate", LocalDate.now().toString());
            append(document, root, "SupplierId", note.getSupplierId());
            append(document, root, "AirlineId", note.getAirlineId());
            append(document, root, "AirportCode", note.getAirportCode());
            append(document, root, "Currency", note.getCurrency());
            append(document, root, "Amount", note.getAmount().toPlainString());
            append(document, root, "Reason", note.getReason());

            TransformerFactory transformers = TransformerFactory.newInstance();
            transformers.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            var transformer = transformers.newTransformer();
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            transformer.transform(new DOMSource(document), new StreamResult(output));
            byte[] xml = output.toByteArray();
            validate(xml);
            return xml;
        } catch (Exception exception) {
            throw new XmlGenerationException("Failed to generate validated credit-note XML: " + exception.getMessage(), exception);
        }
    }

    private void append(Document document, Element root, String name, String value) {
        Element element = document.createElementNS(NAMESPACE, name);
        element.setTextContent(value);
        root.appendChild(element);
    }

    private void validate(byte[] xml) throws Exception {
        SchemaFactory schemas = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        schemas.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        schemas.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        schemas.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        ClassPathResource resource = new ClassPathResource("schema/is-credit-note.xsd");
        try (InputStream stream = resource.getInputStream()) {
            Schema schema = schemas.newSchema(new StreamSource(stream));
            schema.newValidator().validate(new StreamSource(new ByteArrayInputStream(xml)));
        }
    }
}
