package com.airline.xml;

import com.airline.domain.CreditNote;
import com.airline.domain.Dispute;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CreditNoteXmlGenerationTest {
    private final CreditNoteXmlGeneratorService generator = new CreditNoteXmlGeneratorService();

    @Test
    void generatedDocumentIsSchemaValidAndReferencesOriginalInvoiceAndDispute() throws Exception {
        CreditNote note = CreditNote.builder()
                .creditNoteNumber("CN-123")
                .originalInvoiceNumber("INV-456")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("USD")
                .amount(new BigDecimal("125.50"))
                .reason("Accepted operational data mismatch")
                .build();
        Dispute dispute = Dispute.builder().disputeNumber("DSP-789").build();

        byte[] xml = generator.generate(note, dispute);

        DocumentBuilderFactory documents = DocumentBuilderFactory.newInstance();
        documents.setNamespaceAware(true);
        Document document = documents.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        assertThat(document.getDocumentElement().getNamespaceURI())
                .isEqualTo("urn:ghcm:credit-note:1.0");
        assertThat(text(document, "OriginalInvoiceNumber")).isEqualTo("INV-456");
        assertThat(text(document, "DisputeNumber")).isEqualTo("DSP-789");
        assertThat(text(document, "Amount")).isEqualTo("125.50");
    }

    @Test
    void invalidCurrencyFailsSchemaValidation() {
        CreditNote note = CreditNote.builder()
                .creditNoteNumber("CN-123")
                .originalInvoiceNumber("INV-456")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("US")
                .amount(BigDecimal.ONE)
                .reason("Accepted")
                .build();

                org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> generator.generate(note, Dispute.builder().disputeNumber("DSP-789").build()))
                .isInstanceOf(XmlGenerationException.class)
                .hasMessageContaining("validated credit-note XML");
    }

    private String text(Document document, String localName) {
        return document.getElementsByTagNameNS("urn:ghcm:credit-note:1.0", localName)
                .item(0).getTextContent();
    }
}
