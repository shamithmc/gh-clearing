package com.airline.service;

import com.airline.api.dto.UserRequest;
import com.airline.api.dto.UserUpdateRequest;
import com.airline.domain.Tenant;
import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import com.airline.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> AIRLINE_ROLES = Set.of(
            "INVOICE_REVIEWER", "INVOICE_DISPUTER", "CONTRACT_VIEWER",
            "CONTRACT_REVIEWER", "RFP_RAISER", "MIS_VIEWER", "PAYMENT_UPDATER");

    private static final Set<String> GROUND_HANDLER_ROLES = Set.of(
            "ADMIN", "GROUND_HANDLER_ADMIN", "CONTRACT_ENTRY", "CONTRACT_APPROVER", "INVOICE_ENTRY", "INVOICE_APPROVER",
            "STATUS_UPDATER", "MIS_VIEWER", "RFP_MONITOR", "DISPUTE_HANDLER",
            "DISPUTE_APPROVER");

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final TenantContext tenantContext;

    @Transactional
    public User createUser(String tenantId, UserRequest request) {
        Tenant tenant = authorizeTenantManagement(tenantId);
        validateRoles(tenant, request.getRoles());
        if (tenant.getType() == Tenant.TenantType.AIRLINE
                && request.getAirlineRestrictions() != null
                && !request.getAirlineRestrictions().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Airline users are implicitly restricted to their tenant airline");
        }
        if (userRepository.existsByIdAndTenantId(request.getId(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User with id '" + request.getId() + "' already exists");
        }
        if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User with email '" + request.getEmail() + "' already exists in this tenant");
        }
        User user = User.builder()
                .id(request.getId())
                .tenantId(tenantId)
                .username(request.getUsername())
                .email(request.getEmail())
                .airportRestrictions(request.getAirportRestrictions() != null ? new HashSet<>(request.getAirportRestrictions()) : new HashSet<>())
                .airlineRestrictions(request.getAirlineRestrictions() != null ? new HashSet<>(request.getAirlineRestrictions()) : new HashSet<>())
                .chargeCodeRestrictions(request.getChargeCodeRestrictions() != null ? new HashSet<>(request.getChargeCodeRestrictions()) : new HashSet<>())
                .build();
        user.setRoles(request.getRoles());
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(String tenantId, String userId, UserUpdateRequest request) {
        Tenant tenant = authorizeTenantManagement(tenantId);
        validateRoles(tenant, request.getRoles());
        if (tenant.getType() == Tenant.TenantType.AIRLINE
                && request.getAirlineRestrictions() != null
                && !request.getAirlineRestrictions().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Airline users are implicitly restricted to their tenant airline");
        }
        User user = userRepository.findByIdAndTenantId(userId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found: " + userId));

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User with email '" + request.getEmail() + "' already exists in this tenant");
        }

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setRoles(request.getRoles());
        user.setAirportRestrictions(request.getAirportRestrictions() != null ? new HashSet<>(request.getAirportRestrictions()) : new HashSet<>());
        user.setAirlineRestrictions(request.getAirlineRestrictions() != null ? new HashSet<>(request.getAirlineRestrictions()) : new HashSet<>());
        user.setChargeCodeRestrictions(request.getChargeCodeRestrictions() != null ? new HashSet<>(request.getChargeCodeRestrictions()) : new HashSet<>());

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<User> listUsers(String tenantId) {
        authorizeTenantManagement(tenantId);
        return userRepository.findAllByTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public User getUser(String tenantId, String userId) {
        authorizeTenantManagement(tenantId);
        User user = userRepository.findByIdAndTenantId(userId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found: " + userId));
        return user;
    }

    private Tenant authorizeTenantManagement(String targetTenantId) {
        Tenant targetTenant = tenantRepository.findById(targetTenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tenant not found: " + targetTenantId));
        if (targetTenant.getStatus() != Tenant.TenantStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tenant is not active: " + targetTenantId);
        }

        if (hasAuthority("PLATFORM_ADMIN")
                && "PLATFORM_ADMIN".equals(tenantContext.getCurrentTenantType())) {
            return targetTenant;
        }

        if (!targetTenantId.equals(tenantContext.getCurrentTenantId())) {
            throw new AccessDeniedException("Administrators may manage only their own tenant");
        }

        String currentTenantType = tenantContext.getCurrentTenantType();
        boolean permitted = switch (targetTenant.getType()) {
            case AIRLINE -> "AIRLINE".equals(currentTenantType) && hasAuthority("AIRLINE_ADMIN");
            case GROUND_HANDLER -> "GROUND_HANDLER".equals(currentTenantType)
                    && (hasAuthority("ADMIN") || hasAuthority("GROUND_HANDLER_ADMIN"));
            case PLATFORM_ADMIN -> false;
        };
        if (!permitted) {
            throw new AccessDeniedException("Administrator role does not match the target tenant type");
        }
        return targetTenant;
    }

    private void validateRoles(Tenant tenant, Set<String> requestedRoles) {
        if (requestedRoles == null || requestedRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one role is required");
        }

        Set<String> allowedRoles = switch (tenant.getType()) {
            case AIRLINE -> hasAuthority("PLATFORM_ADMIN")
                    ? union(AIRLINE_ROLES, Set.of("AIRLINE_ADMIN"))
                    : AIRLINE_ROLES;
            case GROUND_HANDLER -> GROUND_HANDLER_ROLES;
            case PLATFORM_ADMIN -> Set.of("PLATFORM_ADMIN");
        };
        if (!allowedRoles.containsAll(requestedRoles)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported roles for " + tenant.getType() + " tenant: " + requestedRoles);
        }
    }

    private Set<String> union(Set<String> first, Set<String> second) {
        java.util.HashSet<String> combined = new java.util.HashSet<>(first);
        combined.addAll(second);
        return combined;
    }

    private boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(granted -> authority.equals(granted.getAuthority()));
    }
}
