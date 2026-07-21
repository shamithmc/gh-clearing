package com.airline.api;

import com.airline.api.dto.UserRequest;
import com.airline.domain.User;
import com.airline.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(com.airline.config.SecurityConfig.class)
class UserControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private UserService userService;

    @Test
    void airlineAdminCanCreateUser() throws Exception {
        UserRequest request = request();
        User created = User.builder()
                .id(request.getId()).tenantId("EK").username(request.getUsername())
                .email(request.getEmail()).build();
        created.setRoles(request.getRoles());
        when(userService.createUser("EK", request)).thenReturn(created);

        mockMvc.perform(post("/api/tenants/EK/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("AIRLINE_ADMIN"))
                                .jwt(token -> token.claim("tenant_id", "EK").claim("tenant_type", "AIRLINE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tenantId").value("EK"))
                .andExpect(jsonPath("$.roles[0]").value("INVOICE_REVIEWER"));
    }

    @Test
    void operationalAirlineUserCannotManageUsers() throws Exception {
        mockMvc.perform(post("/api/tenants/EK/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("INVOICE_REVIEWER"))
                                .jwt(token -> token.claim("tenant_id", "EK").claim("tenant_type", "AIRLINE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isForbidden());
    }

    private UserRequest request() {
        UserRequest request = new UserRequest();
        request.setId("airline-user");
        request.setUsername("Airline User");
        request.setEmail("airline.user@example.test");
        request.setRoles(Set.of("INVOICE_REVIEWER"));
        return request;
    }
}
