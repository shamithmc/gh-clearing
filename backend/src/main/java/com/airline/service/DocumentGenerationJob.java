package com.airline.service;

import com.airline.domain.Invoice;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.InvoiceRepository;
import com.airline.xml.IsXmlGeneratorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class DocumentGenerationJob {

    private static final Logger logger = LoggerFactory.getLogger(DocumentGenerationJob.class);

    private final InvoiceRepository invoiceRepository;
    private final IsXmlGeneratorService xmlGeneratorService;
    private final InvoicePdfService pdfService;
    private final FileStorageService fileStorageService;
    private final InvoiceDispatchService dispatchService;

    public DocumentGenerationJob(InvoiceRepository invoiceRepository,
                                 IsXmlGeneratorService xmlGeneratorService,
                                 InvoicePdfService pdfService,
                                 FileStorageService fileStorageService,
                                 InvoiceDispatchService dispatchService) {
        this.invoiceRepository = invoiceRepository;
        this.xmlGeneratorService = xmlGeneratorService;
        this.pdfService = pdfService;
        this.fileStorageService = fileStorageService;
        this.dispatchService = dispatchService;
    }

    @Async
    @Transactional
    public void generateAndDispatch(String invoiceId, String tenantId) {
        logger.info("Starting asynchronous document generation and dispatch for invoice ID: {}", invoiceId);
        try {
            Invoice invoice = invoiceRepository.findByIdAndTenantId(invoiceId, tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

            // Generate IS-XML and PDF
            byte[] xmlBytes = xmlGeneratorService.generate(invoice);
            byte[] pdfBytes = pdfService.generate(invoice);

            // Store files
            String xmlKey = fileStorageService.store(invoice.getInvoiceNumber() + ".xml", xmlBytes);
            String pdfKey = fileStorageService.store(invoice.getInvoiceNumber() + ".pdf", pdfBytes);

            // Update keys
            invoice.setXmlFileKey(xmlKey);
            invoice.setPdfFileKey(pdfKey);
            invoice.setXmlGeneratedAt(LocalDateTime.now());
            invoice.setPdfGeneratedAt(LocalDateTime.now());

            invoiceRepository.save(invoice);

            // Dispatch
            dispatchService.dispatch(invoice, xmlBytes, pdfBytes);
            logger.info("Successfully generated documents and dispatched email for invoice ID: {}", invoiceId);
        } catch (Exception e) {
            logger.error("Failed to generate documents or dispatch email for invoice ID: {}", invoiceId, e);
        }
    }
}
