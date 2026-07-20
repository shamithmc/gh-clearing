package com.airline.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class TenantContext {

    private static final Set<String> SUPPORTED_TENANT_TYPES = Set.of(
            "GROUND_HANDLER", "AIRLINE", "PLATFORM_ADMIN");

    public String getCurrentTenantId() {
        String tenantId = currentJwt().getToken().getClaimAsString("tenant_id");
        if (tenantId == null || tenantId.isBlank()) {
            throw new AccessDeniedException("Authenticated token is missing the tenant_id claim");
        }
        return tenantId;
    }

    public String getCurrentTenantType() {
        String tenantType = currentJwt().getToken().getClaimAsString("tenant_type");
        if (!SUPPORTED_TENANT_TYPES.contains(tenantType)) {
            throw new AccessDeniedException("Authenticated token has an unsupported tenant_type claim");
        }
        return tenantType;
    }

    private JwtAuthenticationToken currentJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new AccessDeniedException("A valid JWT authentication is required");
        }
        return jwtAuth;
    }
}
