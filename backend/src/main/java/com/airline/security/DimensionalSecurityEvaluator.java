package com.airline.security;

import com.airline.domain.User;
import com.airline.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;

@Component
public class DimensionalSecurityEvaluator {

    private final UserRepository userRepository;

    public DimensionalSecurityEvaluator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void verifyAccess(String airportCode, String airlineId, Set<String> serviceChargeCodes) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            return;
        }

        String userId = jwtAuth.getToken().getSubject();
        if (userId == null) {
            return;
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return;
        }

        User user = userOpt.get();

        // 1. Verify Airport Restriction
        Set<String> airports = user.getAirportRestrictions();
        if (airports != null && !airports.isEmpty() && airportCode != null) {
            if (!airports.contains(airportCode)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "User is restricted from accessing airport: " + airportCode);
            }
        }

        // 2. Verify Airline Restriction
        Set<String> airlines = user.getAirlineRestrictions();
        if (airlines != null && !airlines.isEmpty() && airlineId != null) {
            if (!airlines.contains(airlineId)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "User is restricted from accessing airline: " + airlineId);
            }
        }

        // 3. Verify Service Type (Charge Code) Restrictions
        Set<String> chargeCodes = user.getChargeCodeRestrictions();
        if (chargeCodes != null && !chargeCodes.isEmpty() && serviceChargeCodes != null) {
            for (String code : serviceChargeCodes) {
                if (!chargeCodes.contains(code)) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "User is restricted from accessing charge code: " + code);
                }
            }
        }
    }

    public boolean isAirportPermitted(String airportCode) {
        if (airportCode == null) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String userId = jwtAuth.getToken().getSubject();
            if (userId != null) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    Set<String> airports = userOpt.get().getAirportRestrictions();
                    return airports == null || airports.isEmpty() || airports.contains(airportCode);
                }
            }
        }
        return true;
    }

    public boolean isAirlinePermitted(String airlineId) {
        if (airlineId == null) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String userId = jwtAuth.getToken().getSubject();
            if (userId != null) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    Set<String> airlines = userOpt.get().getAirlineRestrictions();
                    return airlines == null || airlines.isEmpty() || airlines.contains(airlineId);
                }
            }
        }
        return true;
    }

    public boolean isChargeCodePermitted(String chargeCode) {
        if (chargeCode == null) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            String userId = jwtAuth.getToken().getSubject();
            if (userId != null) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    Set<String> chargeCodes = userOpt.get().getChargeCodeRestrictions();
                    return chargeCodes == null || chargeCodes.isEmpty() || chargeCodes.contains(chargeCode);
                }
            }
        }
        return true;
    }
}
