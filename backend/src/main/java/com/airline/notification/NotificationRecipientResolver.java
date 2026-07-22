package com.airline.notification;

import com.airline.domain.User;
import com.airline.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class NotificationRecipientResolver {

    private final UserRepository userRepository;

    public NotificationRecipientResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<String> resolve(
            String tenantId,
            Set<String> requiredRoles,
            String airportCode,
            String airlineId,
            Set<String> chargeCodes) {
        return userRepository.findAllByTenantId(tenantId).stream()
                .filter(user -> user.getRoles().stream().anyMatch(requiredRoles::contains))
                .filter(user -> isDimensionallyPermitted(user, airportCode, airlineId, chargeCodes))
                .map(User::getEmail)
                .filter(email -> email != null && !email.isBlank())
                .distinct()
                .toList();
    }

    private boolean isDimensionallyPermitted(
            User user, String airportCode, String airlineId, Set<String> chargeCodes) {
        return permits(user.getAirportRestrictions(), airportCode)
                && permits(user.getAirlineRestrictions(), airlineId)
                && permitsAll(user.getChargeCodeRestrictions(), chargeCodes);
    }

    private boolean permits(Set<String> restrictions, String value) {
        return restrictions == null || restrictions.isEmpty()
                || (value != null && restrictions.contains(value));
    }

    private boolean permitsAll(Set<String> restrictions, Set<String> values) {
        return restrictions == null || restrictions.isEmpty()
                || (values != null && restrictions.containsAll(values));
    }
}
