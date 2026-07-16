package com.airline.security;

import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import com.airline.service.UserService;
import com.airline.api.dto.UserRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * INV-02: Dimensional Scope Enforcement
 * Verifies that user operations are scoped within a tenant and cross-tenant access is blocked.
 */
@ExtendWith(MockitoExtension.class)
class DimensionalAccessTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TenantRepository tenantRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void createUser_forNonExistentTenant_throwsNotFound() {
        when(tenantRepository.existsById("ghost-tenant")).thenReturn(false);

        UserRequest req = new UserRequest();
        req.setId("u1");
        req.setUsername("john");
        req.setEmail("john@example.com");
        req.setRoles(Set.of("GROUND_HANDLER_ADMIN"));

        assertThatThrownBy(() -> userService.createUser("ghost-tenant", req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void getUser_forDifferentTenant_throwsForbidden() {
        User user = User.builder()
                .id("u1")
                .tenantId("tenant-A")
                .username("alice")
                .email("alice@a.com")
                .build();
        user.setRoles(Set.of("GROUND_HANDLER_ADMIN"));

        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        // Request is for tenant-B but user belongs to tenant-A
        assertThatThrownBy(() -> userService.getUser("tenant-B", "u1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("does not belong to tenant");
    }

    @Test
    void createUser_withValidTenant_succeeds() {
        when(tenantRepository.existsById("tenant-A")).thenReturn(true);
        when(userRepository.existsByEmailAndTenantId("alice@a.com", "tenant-A")).thenReturn(false);

        User saved = User.builder()
                .id("u1").tenantId("tenant-A").username("alice").email("alice@a.com").build();
        saved.setRoles(Set.of("GROUND_HANDLER_ADMIN"));
        when(userRepository.save(any(User.class))).thenReturn(saved);

        UserRequest req = new UserRequest();
        req.setId("u1");
        req.setUsername("alice");
        req.setEmail("alice@a.com");
        req.setRoles(Set.of("GROUND_HANDLER_ADMIN"));

        User result = userService.createUser("tenant-A", req);
        assertThat(result.getTenantId()).isEqualTo("tenant-A");
        assertThat(result.getRoles()).contains("GROUND_HANDLER_ADMIN");
    }
}
