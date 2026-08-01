package com.airline.security;

import com.airline.domain.Tenant;
import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import com.airline.service.AuthenticatedUserProvisioningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticatedUserProvisioningServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TenantRepository tenantRepository;

    private AuthenticatedUserProvisioningService service;

    @BeforeEach
    void setUp() {
        service = new AuthenticatedUserProvisioningService(userRepository, tenantRepository);
    }

    @Test
    void provisionsAuthenticatedKeycloakSubjectForItsTenant() {
        Tenant tenant = Tenant.builder().id("EK").name("Emirates")
                .type(Tenant.TenantType.AIRLINE).status(Tenant.TenantStatus.ACTIVE).build();
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(tenant));
        when(userRepository.findById("6ac9d616-1c13-4ff0-b50a-c725b8b55004")).thenReturn(Optional.empty());

        var response = service.provision(authentication("EK", "AIRLINE"));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User user = userCaptor.getValue();
        assertThat(user.getId()).isEqualTo("6ac9d616-1c13-4ff0-b50a-c725b8b55004");
        assertThat(user.getTenantId()).isEqualTo("EK");
        assertThat(user.getRoles()).containsExactlyInAnyOrder("MIS_VIEWER", "CONTRACT_VIEWER");
        assertThat(response.tenantType()).isEqualTo("AIRLINE");
        assertThat(response.username()).isEqualTo("staging-airline");
    }

    @Test
    void rejectsTokenWhoseTenantTypeDoesNotMatchTenant() {
        Tenant tenant = Tenant.builder().id("EK").name("Emirates")
                .type(Tenant.TenantType.AIRLINE).status(Tenant.TenantStatus.ACTIVE).build();
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(tenant));

        assertThatThrownBy(() -> service.provision(authentication("EK", "GROUND_HANDLER")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("tenant type");
    }

    private JwtAuthenticationToken authentication(String tenantId, String tenantType) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("6ac9d616-1c13-4ff0-b50a-c725b8b55004")
                .claim("tenant_id", tenantId)
                .claim("tenant_type", tenantType)
                .claim("preferred_username", "staging-airline")
                .claim("email", "airline@staging.example")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        return new JwtAuthenticationToken(jwt, List.of(
                new SimpleGrantedAuthority("MIS_VIEWER"),
                new SimpleGrantedAuthority("CONTRACT_VIEWER")));
    }
}
