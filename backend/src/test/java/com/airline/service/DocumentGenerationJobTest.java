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

    @InjectMocks
    private DocumentGenerationJob documentGenerationJob;

    @Test
    void generateAndDispatch_succeeds() {
        Invoice invoice = Invoice.builder()
                .id("inv-1")
                .invoiceNumber("INV-100")
                .status(InvoiceStatus.SENT)
                .build();

        byte[] xmlBytes = "<xml></xml>".getBytes();
        byte[] pdfBytes = "%PDF-1.4".getBytes();

        when(invoiceRepository.findById("inv-1")).thenReturn(Optional.of(invoice));
        when(xmlGeneratorService.generate(invoice)).thenReturn(xmlBytes);
        when(pdfService.generate(invoice)).thenReturn(pdfBytes);
        when(fileStorageService.store("INV-100.xml", xmlBytes)).thenReturn("xml-key");
        when(fileStorageService.store("INV-100.pdf", pdfBytes)).thenReturn("pdf-key");
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        documentGenerationJob.generateAndDispatch("inv-1");

        verify(invoiceRepository).save(invoice);
        verify(dispatchService).dispatch(invoice, xmlBytes, pdfBytes);
        
        assert "xml-key".equals(invoice.getXmlFileKey());
        assert "pdf-key".equals(invoice.getPdfFileKey());
        assert invoice.getXmlGeneratedAt() != null;
        assert invoice.getPdfGeneratedAt() != null;
    }
}
