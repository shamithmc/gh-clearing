package com.airline.service;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.InvoiceRepository;
import com.airline.xml.IsXmlGeneratorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentGenerationJobTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private IsXmlGeneratorService xmlGeneratorService;

    @Mock
    private InvoicePdfService pdfService;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private InvoiceDispatchService dispatchService;

    @Mock
    private InvoiceDispatchJobStateService stateService;

    @InjectMocks
    private DocumentGenerationJob documentGenerationJob;

    @Test
    void generateAndDispatch_succeeds() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .invoiceNumber("INV-100")
                .status(InvoiceStatus.APPROVED)
                .build();

        byte[] xmlBytes = "<xml></xml>".getBytes();
        byte[] pdfBytes = "%PDF-1.4".getBytes();

        when(invoiceRepository.findByIdAndTenantId("inv-1", "GH-1"))
                .thenReturn(Optional.of(invoice));
        when(stateService.claim("inv-1", "GH-1")).thenReturn(true);
        when(xmlGeneratorService.generate(invoice)).thenReturn(xmlBytes);
        when(pdfService.generate(invoice)).thenReturn(pdfBytes);
        when(fileStorageService.store("INV-100.xml", xmlBytes)).thenReturn("xml-key");
        when(fileStorageService.store("INV-100.pdf", pdfBytes)).thenReturn("pdf-key");
        documentGenerationJob.generateAndDispatch("inv-1", "GH-1");

        verify(dispatchService).dispatch(invoice, xmlBytes, pdfBytes);
        verify(stateService).markDelivered(
                eq("inv-1"), eq("GH-1"), eq("xml-key"), eq("pdf-key"), any());
        verify(stateService, never()).markFailed(any(), any(), any());
    }
}
