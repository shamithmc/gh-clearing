package com.airline.api;

import com.airline.service.CreditNoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CreditNoteController.class)
@Import(com.airline.config.SecurityConfig.class)
class CreditNoteControllerSecurityTest {
    @Autowired MockMvc mockMvc;
    @MockBean CreditNoteService creditNoteService;

    @Test
    void unrelatedRoleCannotListCreditNotes() throws Exception {
        mockMvc.perform(get("/api/credit-notes")
                        .with(jwt().authorities(new SimpleGrantedAuthority("MIS_VIEWER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void invoiceReviewerCanListTenantScopedCreditNotes() throws Exception {
        when(creditNoteService.listForCurrentTenant()).thenReturn(List.of());
        mockMvc.perform(get("/api/credit-notes")
                        .with(jwt().authorities(new SimpleGrantedAuthority("INVOICE_REVIEWER"))))
                .andExpect(status().isOk());
    }
}
