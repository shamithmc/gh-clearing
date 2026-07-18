package com.airline.api;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Invoice createInvoice(@Valid @RequestBody Invoice invoice) {
        return invoiceService.createInvoice(invoice);
    }

    @GetMapping
    public List<Invoice> listInvoices() {
        return invoiceService.listInvoices();
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

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvoice(@PathVariable String id) {
        invoiceService.deleteInvoice(id);
    }

    /**
     * Download the IATA IS-XML file for a dispatched invoice.
     * Available once the invoice has been transitioned to SENT.
     */
    @GetMapping("/{id}/xml")
    public ResponseEntity<byte[]> downloadXml(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        if (invoice.getXmlDocument() == null) {
            return ResponseEntity.notFound().build();
        }
        String filename = String.format("invoice-%s.xml", invoice.getInvoiceNumber());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(invoice.getXmlDocument());
    }

    /**
     * Download the PDF invoice for a dispatched invoice.
     * Available once the invoice has been transitioned to SENT.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        if (invoice.getPdfDocument() == null) {
            return ResponseEntity.notFound().build();
        }
        String filename = String.format("invoice-%s.pdf", invoice.getInvoiceNumber());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoice.getPdfDocument());
    }
}

