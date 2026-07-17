package com.airline.pdf;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for PDF generation — boots Spring context to use auto-configured Thymeleaf.
 */
@SpringBootTest
@ActiveProfiles("test")
class InvoicePdfGenerationTest {

    @Autowired
    private InvoicePdfService pdfService;

    @Test
    void testGeneratesNonEmptyPdf() {
        Invoice invoice = buildTestInvoice();
        byte[] pdf = pdfService.generate(invoice);

        assertThat(pdf).isNotNull();
        assertThat(pdf.length).isGreaterThan(0);
        // PDF files begin with the %PDF header
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void testGeneratesPdfForInvoiceWithNoLineItems() {
        Invoice invoice = Invoice.builder()
                .id("inv-pdf-2")
                .invoiceNumber("INV-PDF-002")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("AED")
                .issueDate(LocalDate.of(2025, 1, 15))
                .dueDate(LocalDate.of(2025, 2, 14))
                .status(InvoiceStatus.APPROVED)
                .totalAmount(BigDecimal.ZERO)
                .lineItems(new ArrayList<>())
                .build();

        byte[] pdf = pdfService.generate(invoice);
        assertThat(pdf).isNotNull();
        assertThat(pdf.length).isGreaterThan(0);
    }

    private Invoice buildTestInvoice() {
        InvoiceLineItem lineItem = InvoiceLineItem.builder()
                .id("li-1")
                .flightDate(LocalDate.of(2025, 1, 15))
                .flightNumber("EK001")
                .aircraftReg("A6-EDB")
                .origin("DXB")
                .destination("LHR")
                .chargeCode("RAMP_HANDLING")
                .serviceName("Ramp Handling")
                .formulaType("PF-01")
                .quantityDrivers("{\"passengers\": 150}")
                .calculatedAmount(new BigDecimal("1200.00"))
                .contractId("c-test")
                .build();

        return Invoice.builder()
                .id("inv-pdf-test")
                .invoiceNumber("INV-PDF-001")
                .supplierId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .currency("AED")
                .issueDate(LocalDate.of(2025, 1, 15))
                .dueDate(LocalDate.of(2025, 2, 14))
                .status(InvoiceStatus.APPROVED)
                .totalAmount(new BigDecimal("1200.00"))
                .lineItems(List.of(lineItem))
                .build();
    }
}
