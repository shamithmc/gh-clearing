package com.airline.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class DevAuthFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void mockAuthenticationBeanIsRestrictedToNonProductionProfiles() {
        Profile profile = DevAuthFilter.class.getAnnotation(Profile.class);

        assertThat(profile).isNotNull();
        assertThat(profile.value()).containsExactlyInAnyOrder("dev", "e2e");
    }

    @Test
    void e2eHeadersCreateTenantClaimsWhenFilterIsExplicitlyEnabled() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Mock-Tenant-Id", "GH-1");
        request.addHeader("X-Mock-Tenant-Type", "GROUND_HANDLER");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<Authentication> authentication = new AtomicReference<>();

        new DevAuthFilter().doFilter(request, response,
                (req, res) -> authentication.set(SecurityContextHolder.getContext().getAuthentication()));

        assertThat(authentication.get()).isInstanceOf(JwtAuthenticationToken.class);
        JwtAuthenticationToken jwt = (JwtAuthenticationToken) authentication.get();
        assertThat(jwt.getToken().getClaimAsString("tenant_id")).isEqualTo("GH-1");
        assertThat(jwt.getToken().getClaimAsString("tenant_type")).isEqualTo("GROUND_HANDLER");
        assertThat(jwt.getToken().getSubject()).isEqualTo("dev-GH-1");
    }

    @Test
    void explicitSimulatedUserHeaderSelectsScopedPersona() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Mock-Tenant-Id", "SWISSPORT");
        request.addHeader("X-Mock-Tenant-Type", "GROUND_HANDLER");
        request.addHeader("X-Mock-User-Id", "dev-SWISSPORT-scoped");
        AtomicReference<Authentication> authentication = new AtomicReference<>();

        new DevAuthFilter().doFilter(request, new MockHttpServletResponse(),
                (req, res) -> authentication.set(SecurityContextHolder.getContext().getAuthentication()));

        JwtAuthenticationToken jwt = (JwtAuthenticationToken) authentication.get();
        assertThat(jwt.getToken().getSubject()).isEqualTo("dev-SWISSPORT-scoped");
    }

    @Test
    void platformAdminHeadersReceiveOnlyPlatformAdminAuthority() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Mock-Tenant-Id", "PLATFORM");
        request.addHeader("X-Mock-Tenant-Type", "PLATFORM_ADMIN");
        AtomicReference<Authentication> authentication = new AtomicReference<>();

        new DevAuthFilter().doFilter(request, new MockHttpServletResponse(),
                (req, res) -> authentication.set(SecurityContextHolder.getContext().getAuthentication()));

        JwtAuthenticationToken jwt = (JwtAuthenticationToken) authentication.get();
        assertThat(jwt.getAuthorities()).extracting(Object::toString)
                .containsExactly("PLATFORM_ADMIN");
    }
}
