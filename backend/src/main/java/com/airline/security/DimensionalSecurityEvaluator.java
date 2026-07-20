package com.airline.security;

import com.airline.domain.User;
import com.airline.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DimensionalSecurityEvaluator {

    private final UserRepository userRepository;
    private final TenantContext tenantContext;

    public DimensionalSecurityEvaluator(UserRepository userRepository, TenantContext tenantContext) {
        this.userRepository = userRepository;
        this.tenantContext = tenantContext;
    }

    public void verifyAccess(String airportCode, String airlineId, Set<String> serviceChargeCodes) {
        User user = getCurrentUser();

        // 1. Verify Airport Restriction
        Set<String> airports = user.getAirportRestrictions();
        if (airports != null && !airports.isEmpty()) {
            if (airportCode == null || !airports.contains(airportCode)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "User is restricted from accessing airport: " + airportCode);
            }
        }

        // 2. Verify Airline Restriction
        Set<String> airlines = user.getAirlineRestrictions();
        if (airlines != null && !airlines.isEmpty()) {
            if (airlineId == null || !airlines.contains(airlineId)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "User is restricted from accessing airline: " + airlineId);
            }
        }

        // 3. Verify Service Type (Charge Code) Restrictions
        Set<String> chargeCodes = user.getChargeCodeRestrictions();
        if (chargeCodes != null && !chargeCodes.isEmpty()) {
            if (serviceChargeCodes == null) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Charge-code scope cannot be determined");
            }
            for (String code : serviceChargeCodes) {
                if (code == null || !chargeCodes.contains(code)) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "User is restricted from accessing charge code: " + code);
                }
            }
        }
    }

    public boolean isAirportPermitted(String airportCode) {
        Set<String> airports = getCurrentUser().getAirportRestrictions();
        return airports == null || airports.isEmpty() || (airportCode != null && airports.contains(airportCode));
    }

    public boolean isAirlinePermitted(String airlineId) {
        Set<String> airlines = getCurrentUser().getAirlineRestrictions();
        return airlines == null || airlines.isEmpty() || (airlineId != null && airlines.contains(airlineId));
    }

    public boolean isChargeCodePermitted(String chargeCode) {
        Set<String> chargeCodes = getCurrentUser().getChargeCodeRestrictions();
        return chargeCodes == null || chargeCodes.isEmpty() || (chargeCode != null && chargeCodes.contains(chargeCode));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Dimensional access requires JWT authentication");
        }

        String userId = jwtAuth.getToken().getSubject();
        if (userId == null || userId.isBlank()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authenticated user identifier is missing");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "Authenticated user is not provisioned"));

        if (!tenantContext.getCurrentTenantId().equals(user.getTenantId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authenticated user does not belong to the current tenant");
        }

        return user;
    }
}
