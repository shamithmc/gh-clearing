package com.airline.service;

import com.airline.api.dto.AuthenticatedUserResponse;
import com.airline.domain.Tenant;
import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthenticatedUserProvisioningService {

    private static final Set<String> APPLICATION_ROLES = Set.of(
            "PLATFORM_ADMIN", "AIRLINE_ADMIN", "ADMIN", "GROUND_HANDLER_ADMIN",
            "CONTRACT_ENTRY", "CONTRACT_APPROVER", "CONTRACT_VIEWER", "CONTRACT_REVIEWER",
            "INVOICE_ENTRY", "INVOICE_APPROVER", "INVOICE_REVIEWER", "INVOICE_DISPUTER",
            "STATUS_UPDATER", "PAYMENT_UPDATER", "MIS_VIEWER", "RFP_RAISER", "RFP_MONITOR",
            "DISPUTE_HANDLER", "DISPUTE_APPROVER");

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    @Transactional
    public AuthenticatedUserResponse provision(JwtAuthenticationToken authentication) {
        String userId = required(authentication.getToken().getSubject(), "Authenticated token is missing sub");
        String tenantId = required(authentication.getToken().getClaimAsString("tenant_id"),
                "Authenticated token is missing tenant_id");
        String tenantType = required(authentication.getToken().getClaimAsString("tenant_type"),
                "Authenticated token is missing tenant_type");

        if (userId.length() > 50) {
            throw new AccessDeniedException("Authenticated user identifier exceeds 50 characters");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated tenant is not provisioned"));
        if (tenant.getStatus() != Tenant.TenantStatus.ACTIVE) {
            throw new AccessDeniedException("Authenticated tenant is inactive");
        }
        if (!tenant.getType().name().equals(tenantType)) {
            throw new AccessDeniedException("Authenticated tenant type does not match the provisioned tenant");
        }

        String username = limited(firstNonBlank(
                authentication.getToken().getClaimAsString("preferred_username"), userId), 50);
        String email = limited(firstNonBlank(
                authentication.getToken().getClaimAsString("email"), username + "@workos.invalid"), 100);
        Set<String> roles = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(APPLICATION_ROLES::contains)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (roles.isEmpty()) {
            throw new AccessDeniedException("Authenticated user has no application roles");
        }

        User user = userRepository.findByIdAndTenantId(userId, tenantId).orElseGet(() -> User.builder()
                .id(userId)
                .tenantId(tenantId)
                .username(username)
                .email(email)
                .build());
        if (!tenantId.equals(user.getTenantId())) {
            throw new AccessDeniedException("Authenticated user belongs to a different tenant");
        }

        user.setUsername(username);
        user.setEmail(email);
        user.setRoles(roles);
        userRepository.save(user);

        return new AuthenticatedUserResponse(
                user.getId(), tenantId, tenantType, username, email, Set.copyOf(roles));
    }

    private static String required(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new AccessDeniedException(message);
        }
        return value.trim();
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred.trim();
    }

    private static String limited(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
