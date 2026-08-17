package com.airline.api;

import com.airline.api.dto.TenantRequest;
import com.airline.domain.Tenant;
import com.airline.service.TenantService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TenantController.class)
@Import(com.airline.config.SecurityConfig.class)
class TenantControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private TenantService tenantService;

    @Test
    void platformAdminCanCreateTenant() throws Exception {
        TenantRequest request = new TenantRequest();
        request.setId("LH");
        request.setName("Lufthansa");
        request.setType(Tenant.TenantType.AIRLINE);

        Tenant tenant = Tenant.builder()
                .id("LH")
                .name("Lufthansa")
                .type(Tenant.TenantType.AIRLINE)
                .status(Tenant.TenantStatus.ACTIVE)
                .build();

        when(tenantService.createTenant(any(TenantRequest.class))).thenReturn(tenant);

        mockMvc.perform(post("/api/tenants")
                        .with(jwt().authorities(new SimpleGrantedAuthority("PLATFORM_ADMIN"))
                                .jwt(t -> t.claim("tenant_id", "PLATFORM").claim("tenant_type", "PLATFORM_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("LH"))
                .andExpect(jsonPath("$.name").value("Lufthansa"))
                .andExpect(jsonPath("$.type").value("AIRLINE"));
    }

    @Test
    void platformAdminCanListTenants() throws Exception {
        Tenant tenant1 = Tenant.builder().id("EK").name("Emirates").type(Tenant.TenantType.AIRLINE).status(Tenant.TenantStatus.ACTIVE).build();
        Tenant tenant2 = Tenant.builder().id("SWISSPORT").name("Swissport").type(Tenant.TenantType.GROUND_HANDLER).status(Tenant.TenantStatus.ACTIVE).build();

        when(tenantService.listTenants()).thenReturn(List.of(tenant1, tenant2));

        mockMvc.perform(get("/api/tenants")
                        .with(jwt().authorities(new SimpleGrantedAuthority("PLATFORM_ADMIN"))
                                .jwt(t -> t.claim("tenant_id", "PLATFORM").claim("tenant_type", "PLATFORM_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("EK"))
                .andExpect(jsonPath("$[1].id").value("SWISSPORT"));
    }

    @Test
    void nonPlatformAdminCannotCreateTenant() throws Exception {
        TenantRequest request = new TenantRequest();
        request.setId("LH");
        request.setName("Lufthansa");
        request.setType(Tenant.TenantType.AIRLINE);

        mockMvc.perform(post("/api/tenants")
                        .with(jwt().authorities(new SimpleGrantedAuthority("AIRLINE_ADMIN"))
                                .jwt(t -> t.claim("tenant_id", "EK").claim("tenant_type", "AIRLINE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonPlatformAdminCannotListTenants() throws Exception {
        mockMvc.perform(get("/api/tenants")
                        .with(jwt().authorities(new SimpleGrantedAuthority("GROUND_HANDLER_ADMIN"))
                                .jwt(t -> t.claim("tenant_id", "SWISSPORT").claim("tenant_type", "GROUND_HANDLER"))))
                .andExpect(status().isForbidden());
    }
}
