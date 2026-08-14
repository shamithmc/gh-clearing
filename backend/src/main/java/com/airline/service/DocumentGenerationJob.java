package com.airline.service;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceDispatchJob;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.InvoiceRepository;
import com.airline.xml.IsXmlGeneratorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class DocumentGenerationJob {

    private static final Logger logger = LoggerFactory.getLogger(DocumentGenerationJob.class);

    private final InvoiceRepository invoiceRepository;
    private final IsXmlGeneratorService xmlGeneratorService;
    private final InvoicePdfService pdfService;
    private final FileStorageService fileStorageService;
    private final InvoiceDispatchService dispatchService;
    private final InvoiceDispatchJobStateService stateService;

    public DocumentGenerationJob(InvoiceRepository invoiceRepository,
                                 IsXmlGeneratorService xmlGeneratorService,
                                 InvoicePdfService pdfService,
                                 FileStorageService fileStorageService,
                                 InvoiceDispatchService dispatchService,
                                 InvoiceDispatchJobStateService stateService) {
        this.invoiceRepository = invoiceRepository;
        this.xmlGeneratorService = xmlGeneratorService;
        this.pdfService = pdfService;
        this.fileStorageService = fileStorageService;
        this.dispatchService = dispatchService;
        this.stateService = stateService;
    }

    public InvoiceDispatchJob queue(Invoice invoice) {
        return stateService.queue(invoice);
    }

    public Optional<InvoiceDispatchJob> find(String invoiceId, String tenantId) {
        return stateService.find(invoiceId, tenantId);
    }

    @Async
    public void generateAndDispatch(String invoiceId, String tenantId) {
        logger.info("Starting asynchronous document generation and dispatch for invoice ID: {}", invoiceId);
        try {
            if (!stateService.claim(invoiceId, tenantId)) {
                logger.info("Invoice dispatch job is not claimable; skipping invoice ID: {}", invoiceId);
                return;
            }
            Invoice invoice = invoiceRepository.findByIdAndTenantId(invoiceId, tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

            // Generate application-contract XML and PDF
            byte[] xmlBytes = xmlGeneratorService.generate(invoice);
            byte[] pdfBytes = pdfService.generate(invoice);

            // Store files
            String xmlKey = fileStorageService.store(invoice.getInvoiceNumber() + ".xml", xmlBytes);
            String pdfKey = fileStorageService.store(invoice.getInvoiceNumber() + ".pdf", pdfBytes);

            // Dispatch
            dispatchService.dispatch(invoice, xmlBytes, pdfBytes);
            stateService.markDelivered(
                    invoiceId, tenantId, xmlKey, pdfKey, LocalDateTime.now());
            logger.info("Successfully generated documents and dispatched email for invoice ID: {}", invoiceId);
        } catch (Exception e) {
            logger.error("Failed to generate documents or dispatch email for invoice ID: {}", invoiceId, e);
            try {
                stateService.markFailed(invoiceId, tenantId, e);
            } catch (Exception persistenceFailure) {
                logger.error("Failed to persist dispatch failure for invoice ID: {}", invoiceId, persistenceFailure);
            }
        }
    }
}
