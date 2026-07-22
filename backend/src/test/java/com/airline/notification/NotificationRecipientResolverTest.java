package com.airline.notification;

import com.airline.domain.User;
import com.airline.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationRecipientResolverTest {

    @Mock
    private UserRepository userRepository;

    @Test
    void resolvesOnlyRoleAndDimensionAuthorizedUsersInsideTargetTenant() {
        User permitted = user("permitted@gh.test", "CONTRACT_APPROVER", Set.of("DXB"), Set.of("EK"),
                Set.of("BAGGAGE"));
        User wrongRole = user("wrong-role@gh.test", "MIS_VIEWER", Set.of(), Set.of(), Set.of());
        User wrongAirport = user("wrong-airport@gh.test", "CONTRACT_ENTRY", Set.of("LHR"), Set.of(), Set.of());
        User wrongAirline = user("wrong-airline@gh.test", "CONTRACT_ENTRY", Set.of(), Set.of("LH"), Set.of());
        User wrongService = user("wrong-service@gh.test", "CONTRACT_ENTRY", Set.of(), Set.of(),
                Set.of("CATERING"));
        when(userRepository.findAllByTenantId("SWISSPORT"))
                .thenReturn(List.of(permitted, wrongRole, wrongAirport, wrongAirline, wrongService));

        NotificationRecipientResolver resolver = new NotificationRecipientResolver(userRepository);

        assertThat(resolver.resolve(
                "SWISSPORT", Set.of("CONTRACT_ENTRY", "CONTRACT_APPROVER"),
                "DXB", "EK", Set.of("BAGGAGE")))
                .containsExactly("permitted@gh.test");
    }

    private User user(
            String email,
            String roles,
            Set<String> airports,
            Set<String> airlines,
            Set<String> chargeCodes) {
        return User.builder()
                .id(email)
                .tenantId("SWISSPORT")
                .username(email)
                .email(email)
                .rolesRaw(roles)
                .airportRestrictions(airports)
                .airlineRestrictions(airlines)
                .chargeCodeRestrictions(chargeCodes)
                .build();
    }
}
