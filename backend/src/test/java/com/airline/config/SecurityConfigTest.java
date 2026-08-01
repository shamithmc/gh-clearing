package com.airline.config;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void extractsFlatRealmAndClientRoles() {
        Map<String, Object> claims = Map.of(
                "roles", List.of("MIS_VIEWER"),
                "realm_access", Map.of("roles", List.of("CONTRACT_VIEWER")),
                "resource_access", Map.of(
                        "gh-clearing-web", Map.of("roles", List.of("INVOICE_REVIEWER", "MIS_VIEWER"))));

        assertThat(SecurityConfig.extractRoles(claims, "gh-clearing-web"))
                .containsExactly("MIS_VIEWER", "CONTRACT_VIEWER", "INVOICE_REVIEWER");
    }

    @Test
    void ignoresRolesForOtherClients() {
        Map<String, Object> claims = Map.of(
                "resource_access", Map.of("another-client", Map.of("roles", List.of("ADMIN"))));

        assertThat(SecurityConfig.extractRoles(claims, "gh-clearing-web")).isEmpty();
    }
}
