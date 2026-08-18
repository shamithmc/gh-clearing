package com.airline.api;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.api.dto.InvoiceDispatchStatusResponse;
import com.airline.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.airline.api.dto.InvoiceDisputeRequest;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final com.airline.service.FileStorageService fileStorageService;
    private final com.airline.xml.IsXmlGeneratorService xmlGeneratorService;
    private final com.airline.pdf.InvoicePdfService pdfService;

    public InvoiceController(InvoiceService invoiceService,
                             com.airline.service.FileStorageService fileStorageService,
                             com.airline.xml.IsXmlGeneratorService xmlGeneratorService,
                             com.airline.pdf.InvoicePdfService pdfService) {
        this.invoiceService = invoiceService;
        this.fileStorageService = fileStorageService;
        this.xmlGeneratorService = xmlGeneratorService;
        this.pdfService = pdfService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Invoice createInvoice(@Valid @RequestBody Invoice invoice) {
        return invoiceService.createInvoice(invoice);
    }

    @GetMapping
    public List<Invoice> listInvoices(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType) {
        return invoiceService.listInvoices(status, airportCode, serviceType);
    }

    @GetMapping("/{id}")
    public Invoice getInvoice(@PathVariable String id) {
        return invoiceService.getInvoice(id);
    }

    @PutMapping("/{id}")
    public Invoice updateInvoice(@PathVariable String id, @Valid @RequestBody Invoice invoice) {
        return invoiceService.updateInvoice(id, invoice);
    }

    @PutMapping("/{id}/status")
    public Invoice updateInvoiceStatus(
            @PathVariable String id,
            @RequestParam InvoiceStatus status,
            @RequestParam(required = false) String comments) {
        return invoiceService.updateInvoiceStatus(id, status, comments);
    }

    @GetMapping("/{id}/dispatch")
    public InvoiceDispatchStatusResponse getDispatchStatus(@PathVariable String id) {
        return InvoiceDispatchStatusResponse.from(invoiceService.getDispatchStatus(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvoice(@PathVariable String id) {
        invoiceService.deleteInvoice(id);
    }

    /**
     * Download the application-contract XML file for an invoice.
     * Loads from storage if available, otherwise generates dynamically.
     */
    @GetMapping("/{id}/xml")
    public ResponseEntity<byte[]> downloadXml(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        byte[] xmlBytes = null;
        if (invoice.getXmlFileKey() != null) {
            try {
                xmlBytes = fileStorageService.load(invoice.getXmlFileKey());
            } catch (Exception ignored) {
                // Fallback to dynamic generation if file is missing in storage
            }
        }
        if (xmlBytes == null) {
            try {
                xmlBytes = xmlGeneratorService.generate(invoice);
            } catch (Exception e) {
                return ResponseEntity.notFound().build();
            }
        }
        String filename = String.format("invoice-%s.xml", invoice.getInvoiceNumber());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(xmlBytes);
    }

    /**
     * Download the PDF invoice for an invoice.
     * Loads from storage if available, otherwise generates dynamically.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        byte[] pdfBytes = null;
        if (invoice.getPdfFileKey() != null) {
            try {
                pdfBytes = fileStorageService.load(invoice.getPdfFileKey());
            } catch (Exception ignored) {
                // Fallback to dynamic generation if file is missing in storage
            }
        }
        if (pdfBytes == null) {
            try {
                pdfBytes = pdfService.generate(invoice);
            } catch (Exception e) {
                return ResponseEntity.notFound().build();
            }
        }
        String filename = String.format("invoice-%s.pdf", invoice.getInvoiceNumber());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PutMapping("/{id}/dispute")
    public Invoice disputeInvoice(@PathVariable String id, @RequestBody InvoiceDisputeRequest request) {
        return invoiceService.disputeInvoice(id, request);
    }

}
