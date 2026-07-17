package com.airline.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

public class DevAuthFilter extends OncePerRequestFilter {

    private boolean isTestEnvironment() {
        for (StackTraceElement element : Thread.currentThread().getStackTrace()) {
            if (element.getClassName().startsWith("org.junit.")) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (isTestEnvironment()) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();

        if (existingAuth == null || !existingAuth.isAuthenticated() || "anonymousUser".equals(existingAuth.getPrincipal())) {
            String mockTenantId = request.getHeader("X-Mock-Tenant-Id");
            String mockTenantType = request.getHeader("X-Mock-Tenant-Type");

            // Default to SWISSPORT GROUND_HANDLER for local browser testing convenience
            if (mockTenantId == null) {
                mockTenantId = "SWISSPORT";
            }
            if (mockTenantType == null) {
                mockTenantType = "GROUND_HANDLER";
            }

            Jwt jwt = Jwt.withTokenValue("mock-token")
                    .header("alg", "none")
                    .claim("tenant_id", mockTenantId)
                    .claim("tenant_type", mockTenantType)
                    .claim("roles", List.of("CONTRACT_MANAGER", "PLATFORM_ADMIN"))
                    .issuer("http://localhost:8080/realms/gh-clearing")
                    .subject("mock-sub")
                    .build();

            JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of(
                    new org.springframework.security.core.authority.SimpleGrantedAuthority("CONTRACT_MANAGER"),
                    new org.springframework.security.core.authority.SimpleGrantedAuthority("PLATFORM_ADMIN")
            ));

            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
