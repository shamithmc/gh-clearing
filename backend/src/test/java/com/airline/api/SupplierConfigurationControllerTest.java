package com.airline.api;

import com.airline.domain.SupplierConfiguration;
import com.airline.service.SupplierConfigurationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SupplierConfigurationController.class)
@Import(com.airline.config.SecurityConfig.class)
class SupplierConfigurationControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private SupplierConfigurationService supplierConfigurationService;

    @Test
    void groundHandlerAdminCanReadConfiguration() throws Exception {
        when(supplierConfigurationService.getConfiguration("SWISSPORT"))
                .thenReturn(SupplierConfiguration.builder()
                        .tenantId("SWISSPORT")
                        .invoiceBackdatingDays(30)
                        .build());

        mockMvc.perform(get("/api/tenants/SWISSPORT/configuration")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tenantId").value("SWISSPORT"))
                .andExpect(jsonPath("$.invoiceBackdatingDays").value(30));
    }

    @Test
    void operationalGroundHandlerUserCannotUpdateConfiguration() throws Exception {
        mockMvc.perform(put("/api/tenants/SWISSPORT/configuration")
                        .with(jwt().authorities(new SimpleGrantedAuthority("CONTRACT_ENTRY")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"invoiceBackdatingDays\":30}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidConfigurationIsRejectedBeforeServiceCall() throws Exception {
        String invalid = """
                {
                  "emailIds": "%s",
                  "invoiceBackdatingDays": -1,
                  "enabledAirlines": ["TOO-LONG"],
                  "enabledAirports": ["dxb"]
                }
                """.formatted("x".repeat(256));

        mockMvc.perform(put("/api/tenants/SWISSPORT/configuration")
                        .with(jwt().authorities(new SimpleGrantedAuthority("GROUND_HANDLER_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalid))
                .andExpect(status().isBadRequest());
    }
}
