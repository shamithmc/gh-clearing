package com.airline.dispatch;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceDispatchJob;
import com.airline.domain.InvoiceDispatchStatus;
import com.airline.domain.InvoiceStatus;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.InvoiceRepository;
import com.airline.service.DocumentGenerationJob;
import com.airline.service.FileStorageService;
import com.airline.service.InvoiceDispatchJobStateService;
import com.airline.service.InvoiceDispatchService;
import com.airline.xml.IsXmlGeneratorService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(properties = "app.mail.simulate-delivery=false")
@ActiveProfiles("e2e")
class InvoiceDispatchWorkflowIntegrationTest {

    private static final String SUPPLIER = "DISPATCH-GH";
    private static final String AIRLINE = "DISPATCH-AL";

    @Autowired
    private InvoiceRepository invoiceRepository;
    @Autowired
    private InvoiceDispatchJobStateService stateService;
    @Autowired
    private DocumentGenerationJob documentGenerationJob;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private IsXmlGeneratorService xmlGeneratorService;
    @MockBean
    private InvoicePdfService pdfService;
    @MockBean
    private FileStorageService fileStorageService;
    @MockBean
    private InvoiceDispatchService dispatchService;

    @AfterEach
    void cleanUp() {
        jdbcTemplate.update("DELETE FROM invoice_dispatch_jobs WHERE tenant_id = ?", SUPPLIER);
        jdbcTemplate.update("DELETE FROM invoice_audit_logs WHERE invoice_id LIKE 'dispatch-%'");
        jdbcTemplate.update("DELETE FROM invoices WHERE tenant_id = ?", SUPPLIER);
        jdbcTemplate.update("DELETE FROM tenants WHERE id IN (?, ?)", SUPPLIER, AIRLINE);
        reset(xmlGeneratorService, pdfService, fileStorageService, dispatchService);
    }

    @Test
    void successfulDeliveryIsTheOnlyEventThatMarksInvoiceSent() {
        Invoice invoice = persistApprovedInvoice("dispatch-success");
        stubDocuments(invoice);

        stateService.queue(invoice);
        documentGenerationJob.generateAndDispatch(invoice.getId(), SUPPLIER);

        Invoice persisted = load(invoice.getId());
        InvoiceDispatchJob job = loadJob(invoice.getId());
        assertThat(persisted.getStatus()).isEqualTo(InvoiceStatus.SENT);
        assertThat(persisted.getXmlFileKey()).isEqualTo("xml-key");
        assertThat(persisted.getPdfFileKey()).isEqualTo("pdf-key");
        assertThat(job.getStatus()).isEqualTo(InvoiceDispatchStatus.DELIVERED);
        assertThat(job.getAttemptCount()).isEqualTo(1);
        assertThat(job.getLastError()).isNull();
        assertThat(job.getDeliveredAt()).isNotNull();
    }

    @Test
    void generationFailureLeavesInvoiceApprovedAndPersistsActionableFailure() {
        Invoice invoice = persistApprovedInvoice("dispatch-failure");
        when(xmlGeneratorService.generate(any(Invoice.class)))
                .thenThrow(new IllegalStateException("schema validation rejected invoice"));

        stateService.queue(invoice);
        documentGenerationJob.generateAndDispatch(invoice.getId(), SUPPLIER);

        assertThat(load(invoice.getId()).getStatus()).isEqualTo(InvoiceStatus.APPROVED);
        InvoiceDispatchJob job = loadJob(invoice.getId());
        assertThat(job.getStatus()).isEqualTo(InvoiceDispatchStatus.FAILED);
        assertThat(job.getAttemptCount()).isEqualTo(1);
        assertThat(job.getLastError()).contains("schema validation rejected invoice");
        assertThat(job.getDeliveredAt()).isNull();
    }

    @Test
    void failedJobRetriesInPlaceAndDeliveredJobIsIdempotent() {
        Invoice invoice = persistApprovedInvoice("dispatch-retry");
        stubDocuments(invoice);
        doThrow(new IllegalStateException("SMTP unavailable"))
                .doNothing()
                .when(dispatchService).dispatch(any(Invoice.class), any(byte[].class), any(byte[].class));

        InvoiceDispatchJob original = stateService.queue(invoice);
        documentGenerationJob.generateAndDispatch(invoice.getId(), SUPPLIER);
        assertThat(loadJob(invoice.getId()).getStatus()).isEqualTo(InvoiceDispatchStatus.FAILED);
        assertThat(load(invoice.getId()).getStatus()).isEqualTo(InvoiceStatus.APPROVED);

        InvoiceDispatchJob retried = stateService.queue(load(invoice.getId()));
        documentGenerationJob.generateAndDispatch(invoice.getId(), SUPPLIER);
        documentGenerationJob.generateAndDispatch(invoice.getId(), SUPPLIER);

        InvoiceDispatchJob delivered = loadJob(invoice.getId());
        assertThat(retried.getId()).isEqualTo(original.getId());
        assertThat(delivered.getId()).isEqualTo(original.getId());
        assertThat(delivered.getStatus()).isEqualTo(InvoiceDispatchStatus.DELIVERED);
        assertThat(delivered.getAttemptCount()).isEqualTo(2);
        assertThat(load(invoice.getId()).getStatus()).isEqualTo(InvoiceStatus.SENT);
        verify(dispatchService, times(2))
                .dispatch(any(Invoice.class), any(byte[].class), any(byte[].class));
    }

    private Invoice persistApprovedInvoice(String id) {
        jdbcTemplate.update("""
                INSERT INTO tenants (id, name, type, status)
                VALUES (?, 'Dispatch Supplier', 'GROUND_HANDLER', 'ACTIVE')
                ON CONFLICT (id) DO NOTHING
                """, SUPPLIER);
        jdbcTemplate.update("""
                INSERT INTO tenants (id, name, type, status)
                VALUES (?, 'Dispatch Airline', 'AIRLINE', 'ACTIVE')
                ON CONFLICT (id) DO NOTHING
                """, AIRLINE);
        return invoiceRepository.save(Invoice.builder()
                .id(id)
                .invoiceNumber("INV-" + id)
                .supplierId(SUPPLIER)
                .airlineId(AIRLINE)
                .airportCode("DXB")
                .currency("USD")
                .issueDate(LocalDate.of(2026, 8, 1))
                .dueDate(LocalDate.of(2026, 8, 31))
                .status(InvoiceStatus.APPROVED)
                .totalAmount(new BigDecimal("1250.00"))
                .lineItems(new ArrayList<>())
                .build());
    }

    private void stubDocuments(Invoice invoice) {
        byte[] xml = "<Invoice/>".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] pdf = "%PDF-test".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        when(xmlGeneratorService.generate(any(Invoice.class))).thenReturn(xml);
        when(pdfService.generate(any(Invoice.class))).thenReturn(pdf);
        when(fileStorageService.store(invoice.getInvoiceNumber() + ".xml", xml)).thenReturn("xml-key");
        when(fileStorageService.store(invoice.getInvoiceNumber() + ".pdf", pdf)).thenReturn("pdf-key");
    }

    private Invoice load(String invoiceId) {
        return invoiceRepository.findByIdAndTenantId(invoiceId, SUPPLIER).orElseThrow();
    }

    private InvoiceDispatchJob loadJob(String invoiceId) {
        return stateService.find(invoiceId, SUPPLIER).orElseThrow();
    }
}
