package com.airline.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

@Component
@Profile({"dev", "e2e"})
public class DevAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();

        if (existingAuth == null || !existingAuth.isAuthenticated() || "anonymousUser".equals(existingAuth.getPrincipal())) {
            String mockTenantId = request.getHeader("X-Mock-Tenant-Id");
            String mockTenantType = request.getHeader("X-Mock-Tenant-Type");
            String mockUserId = request.getHeader("X-Mock-User-Id");

            // Default to SWISSPORT GROUND_HANDLER for local browser testing convenience
            if (mockTenantId == null) {
                mockTenantId = "SWISSPORT";
            }
            if (mockTenantType == null) {
                mockTenantType = "GROUND_HANDLER";
            }
            if (mockUserId == null || mockUserId.isBlank()) {
                mockUserId = "dev-" + mockTenantId;
            }

            List<String> roles;
            if ("GROUND_HANDLER".equals(mockTenantType)) {
                roles = List.of("ADMIN", "CONTRACT_ENTRY", "CONTRACT_APPROVER", "INVOICE_ENTRY",
                        "INVOICE_APPROVER", "STATUS_UPDATER", "MIS_VIEWER", "RFP_MONITOR",
                        "DISPUTE_HANDLER", "DISPUTE_APPROVER");
            } else if ("PLATFORM_ADMIN".equals(mockTenantType)) {
                roles = List.of("PLATFORM_ADMIN");
            } else {
                roles = List.of("INVOICE_REVIEWER", "INVOICE_DISPUTER", "CONTRACT_VIEWER",
                        "CONTRACT_REVIEWER", "RFP_RAISER", "MIS_VIEWER", "PAYMENT_UPDATER");
            }

            Jwt jwt = Jwt.withTokenValue("mock-token")
                    .header("alg", "none")
                    .claim("tenant_id", mockTenantId)
                    .claim("tenant_type", mockTenantType)
                    .claim("roles", roles)
                    .issuer("http://localhost:8080/realms/gh-clearing")
                    .subject(mockUserId)
                    .build();

            JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, roles.stream()
                    .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                    .toList());

            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
