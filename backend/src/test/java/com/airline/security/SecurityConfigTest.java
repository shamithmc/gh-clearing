package com.airline.config;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void extractsAndNormalizesWorkOsSingleAndMultipleRoles() {
        Map<String, Object> claims = Map.of(
                "role", "mis-viewer",
                "roles", List.of("contract-viewer", "INVOICE_REVIEWER"));

        assertThat(SecurityConfig.extractRoles(claims))
                .containsExactly("MIS_VIEWER", "CONTRACT_VIEWER", "INVOICE_REVIEWER");
    }

    @Test
    void ignoresUnrelatedClaims() {
        Map<String, Object> claims = Map.of("permissions", List.of("invoices:view"));

        assertThat(SecurityConfig.extractRoles(claims)).isEmpty();
    }
}
