package com.airline.api;

import com.airline.api.dto.UserRequest;
import com.airline.api.dto.UserUpdateRequest;
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

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void groundHandlerAdminCanUpdateUser() throws Exception {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setUsername("Updated Agent");
        request.setEmail("agent.updated@swissport.test");
        request.setRoles(Set.of("CONTRACT_ENTRY", "INVOICE_ENTRY"));
        request.setAirportRestrictions(Set.of("DXB"));

        User updated = User.builder()
                .id("gh-user-1").tenantId("SWISSPORT").username("Updated Agent")
                .email("agent.updated@swissport.test")
                .airportRestrictions(Set.of("DXB")).build();
        updated.setRoles(request.getRoles());

        when(userService.updateUser(eq("SWISSPORT"), eq("gh-user-1"), any(UserUpdateRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/tenants/SWISSPORT/users/gh-user-1")
                        .with(jwt().authorities(new SimpleGrantedAuthority("GROUND_HANDLER_ADMIN"))
                                .jwt(token -> token.claim("tenant_id", "SWISSPORT").claim("tenant_type", "GROUND_HANDLER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Updated Agent"))
                .andExpect(jsonPath("$.airportRestrictions[0]").value("DXB"));
    }

    @Test
    void platformAdminCanListUsers() throws Exception {
        User user = User.builder().id("u1").tenantId("EK").username("User 1").email("u1@ek.test").build();
        user.setRoles(Set.of("INVOICE_REVIEWER"));
        when(userService.listUsers("EK")).thenReturn(List.of(user));

        mockMvc.perform(get("/api/tenants/EK/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("PLATFORM_ADMIN"))
                                .jwt(token -> token.claim("tenant_id", "PLATFORM").claim("tenant_type", "PLATFORM_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("u1"));
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
