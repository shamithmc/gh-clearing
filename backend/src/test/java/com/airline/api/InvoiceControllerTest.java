package com.airline.api;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.service.FileStorageService;
import com.airline.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InvoiceController.class)
@Import(com.airline.config.SecurityConfig.class)
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService invoiceService;

    @MockBean
    private FileStorageService fileStorageService;

    @MockBean
    private com.airline.xml.IsXmlGeneratorService xmlGeneratorService;

    @MockBean
    private com.airline.pdf.InvoicePdfService pdfService;

    @Test
    void propagatesAirlineInvoiceFilters() throws Exception {
        Invoice invoice = Invoice.builder().id("invoice-1").status(InvoiceStatus.SENT).build();
        when(invoiceService.listInvoices(InvoiceStatus.SENT, "DXB", "BAGGAGE"))
                .thenReturn(List.of(invoice));

        mockMvc.perform(get("/api/invoices")
                        .queryParam("status", "SENT")
                        .queryParam("airportCode", "DXB")
                        .queryParam("serviceType", "BAGGAGE")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("INVOICE_REVIEWER")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("invoice-1"));

        verify(invoiceService).listInvoices(InvoiceStatus.SENT, "DXB", "BAGGAGE");
    }

    @Test
    void downloadsInvoiceXmlThroughSecuredInvoiceLookup() throws Exception {
        Invoice invoice = Invoice.builder()
                .id("invoice-1")
                .invoiceNumber("INV-100")
                .xmlFileKey("tenant/invoice.xml")
                .build();
        when(invoiceService.getInvoice("invoice-1")).thenReturn(invoice);
        when(fileStorageService.load("tenant/invoice.xml")).thenReturn("<Invoice/>".getBytes());

        mockMvc.perform(get("/api/invoices/invoice-1/xml")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("INVOICE_REVIEWER")))))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"invoice-INV-100.xml\""))
                .andExpect(content().contentType("application/xml"))
                .andExpect(content().bytes("<Invoice/>".getBytes()));

        verify(invoiceService).getInvoice("invoice-1");
    }

    @Test
    void downloadsInvoiceXmlDynamicallyWhenFileKeyIsNull() throws Exception {
        Invoice invoice = Invoice.builder()
                .id("invoice-2")
                .invoiceNumber("INV-200")
                .xmlFileKey(null)
                .build();
        when(invoiceService.getInvoice("invoice-2")).thenReturn(invoice);
        when(xmlGeneratorService.generate(invoice)).thenReturn("<GeneratedXml/>".getBytes());

        mockMvc.perform(get("/api/invoices/invoice-2/xml")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("INVOICE_REVIEWER")))))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"invoice-INV-200.xml\""))
                .andExpect(content().contentType("application/xml"))
                .andExpect(content().bytes("<GeneratedXml/>".getBytes()));

        verify(xmlGeneratorService).generate(invoice);
    }

    @Test
    void downloadsInvoicePdfDynamicallyWhenFileKeyIsNull() throws Exception {
        Invoice invoice = Invoice.builder()
                .id("invoice-3")
                .invoiceNumber("INV-300")
                .pdfFileKey(null)
                .build();
        when(invoiceService.getInvoice("invoice-3")).thenReturn(invoice);
        when(pdfService.generate(invoice)).thenReturn("%PDF-1.4".getBytes());

        mockMvc.perform(get("/api/invoices/invoice-3/pdf")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("INVOICE_REVIEWER")))))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"invoice-INV-300.pdf\""))
                .andExpect(content().contentType("application/pdf"))
                .andExpect(content().bytes("%PDF-1.4".getBytes()));

        verify(pdfService).generate(invoice);
    }
}
