package com.airline.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class WorkOsClientIdValidatorTest {
    private final WorkOsClientIdValidator validator = new WorkOsClientIdValidator("client_expected");

    @Test
    void acceptsTokenForConfiguredApplication() {
        assertThat(validator.validate(jwt("client_expected")).hasErrors()).isFalse();
    }

    @Test
    void rejectsTokenForAnotherWorkOsApplication() {
        assertThat(validator.validate(jwt("client_other")).hasErrors()).isTrue();
    }

    private Jwt jwt(String clientId) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("user_123")
                .claim("client_id", clientId)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
    }
}
