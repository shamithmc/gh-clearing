package com.airline.pdf;

import com.airline.domain.Invoice;
import com.lowagie.text.Document;
import com.lowagie.text.html.simpleparser.HTMLWorker;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.io.StringReader;
import java.time.LocalDateTime;

/**
 * Generates PDF invoices by rendering the Thymeleaf HTML template (invoice-pdf.html)
 * and converting the output to PDF using OpenPDF's HTMLWorker.
 */
@Service
public class InvoicePdfService {

    private final TemplateEngine templateEngine;

    public InvoicePdfService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    /**
     * Generates a PDF byte array for the given invoice.
     *
     * @param invoice the approved Invoice domain object
     * @return PDF bytes
     * @throws PdfGenerationException if rendering or PDF conversion fails
     */
    public byte[] generate(Invoice invoice) {
        // Step 1: Render Thymeleaf HTML template
        String html = renderHtml(invoice);

        // Step 2: Convert HTML → PDF via OpenPDF
        return convertToPdf(html);
    }

    private String renderHtml(Invoice invoice) {
        Context context = new Context();
        context.setVariable("invoice", invoice);
        context.setVariable("generatedAt", LocalDateTime.now());
        return templateEngine.process("invoice-pdf", context);
    }

    private byte[] convertToPdf(String html) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            HTMLWorker htmlWorker = new HTMLWorker(document);
            htmlWorker.parse(new StringReader(html));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new PdfGenerationException("Failed to convert invoice HTML to PDF: " + e.getMessage(), e);
        }
    }
}
