package com.airline.api;

import com.airline.domain.Dispute;
import com.airline.domain.DisputeCategory;
import com.airline.domain.DisputeStatus;
import com.airline.service.DisputeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DisputeController.class)
@Import(com.airline.config.SecurityConfig.class)
class DisputeControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DisputeService disputeService;

    @Test
    void invoiceReviewerCannotInitiateDispute() throws Exception {
        mockMvc.perform(post("/api/disputes/invoice/invoice-1")
                        .with(jwt().authorities(new SimpleGrantedAuthority("INVOICE_REVIEWER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lineItems\":[]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void invoiceDisputerCanInitiateDispute() throws Exception {
        when(disputeService.createDispute(eq("invoice-1"), any())).thenReturn(dispute());

        mockMvc.perform(post("/api/disputes/invoice/invoice-1")
                        .with(jwt().authorities(new SimpleGrantedAuthority("INVOICE_DISPUTER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lineItems\":[]}"))
                .andExpect(status().isOk());
    }

    @Test
    void unrelatedRoleCannotRespondToDispute() throws Exception {
        mockMvc.perform(post("/api/disputes/dispute-1/respond")
                        .with(jwt().authorities(new SimpleGrantedAuthority("MIS_VIEWER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Reviewing\",\"action\":\"RESPOND\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void disputeHandlerCanReachResponseEndpoint() throws Exception {
        when(disputeService.respondToDispute("dispute-1", "Reviewing", "RESPOND"))
                .thenReturn(dispute());

        mockMvc.perform(post("/api/disputes/dispute-1/respond")
                        .with(jwt().authorities(new SimpleGrantedAuthority("DISPUTE_HANDLER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Reviewing\",\"action\":\"RESPOND\"}"))
                .andExpect(status().isOk());
    }

    private Dispute dispute() {
        return Dispute.builder()
                .id("dispute-1")
                .disputeNumber("DSP-1")
                .invoiceId("invoice-1")
                .invoiceNumber("INV-1")
                .airlineId("EK")
                .supplierId("SWISSPORT")
                .airportCode("DXB")
                .status(DisputeStatus.OPEN)
                .category(DisputeCategory.OPERATIONAL_DATA_MISMATCH)
                .disputedAmount(new BigDecimal("1500.00"))
                .lineItems(new ArrayList<>())
                .messages(new ArrayList<>())
                .build();
    }
}
