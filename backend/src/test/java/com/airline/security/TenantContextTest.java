package com.airline.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantContextTest {

    private final TenantContext tenantContext = new TenantContext();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void missingAuthenticationFailsClosed() {
        assertThatThrownBy(tenantContext::getCurrentTenantId)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("valid JWT");
    }

    @Test
    void missingTenantIdClaimFailsClosed() {
        authenticate(Map.of("tenant_type", "GROUND_HANDLER"));

        assertThatThrownBy(tenantContext::getCurrentTenantId)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("tenant_id");
    }

    @Test
    void unsupportedTenantTypeFailsClosed() {
        authenticate(Map.of("tenant_id", "GH-1", "tenant_type", "UNSUPPORTED"));

        assertThatThrownBy(tenantContext::getCurrentTenantType)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("unsupported tenant_type");
    }

    @Test
    void validTenantClaimsAreReturned() {
        authenticate(Map.of("tenant_id", "GH-1", "tenant_type", "GROUND_HANDLER"));

        assertThat(tenantContext.getCurrentTenantId()).isEqualTo("GH-1");
        assertThat(tenantContext.getCurrentTenantType()).isEqualTo("GROUND_HANDLER");
    }

    private void authenticate(Map<String, Object> claims) {
        Jwt jwt = new Jwt(
                "token",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "none"),
                claims);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("TEST_USER"))));
        SecurityContextHolder.setContext(context);
    }
}
