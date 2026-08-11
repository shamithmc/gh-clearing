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

    public InvoiceController(InvoiceService invoiceService, com.airline.service.FileStorageService fileStorageService) {
        this.invoiceService = invoiceService;
        this.fileStorageService = fileStorageService;
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
     * Download the IATA IS-XML file for a dispatched invoice.
     * Available once the invoice has been transitioned to SENT.
     */
    @GetMapping("/{id}/xml")
    public ResponseEntity<byte[]> downloadXml(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        if (invoice.getXmlFileKey() == null) {
            return ResponseEntity.notFound().build();
        }
        byte[] xmlBytes = fileStorageService.load(invoice.getXmlFileKey());
        String filename = String.format("invoice-%s.xml", invoice.getInvoiceNumber());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(xmlBytes);
    }

    /**
     * Download the PDF invoice for a dispatched invoice.
     * Available once the invoice has been transitioned to SENT.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String id) {
        Invoice invoice = invoiceService.getInvoice(id);
        if (invoice.getPdfFileKey() == null) {
            return ResponseEntity.notFound().build();
        }
        byte[] pdfBytes = fileStorageService.load(invoice.getPdfFileKey());
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
