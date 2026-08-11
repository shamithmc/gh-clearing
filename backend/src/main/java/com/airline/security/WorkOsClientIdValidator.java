package com.airline.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/** Prevents a valid token issued for another WorkOS application from being accepted. */
public final class WorkOsClientIdValidator implements OAuth2TokenValidator<Jwt> {
    private static final OAuth2Error INVALID_CLIENT = new OAuth2Error(
            "invalid_token", "JWT client_id does not match this application", null);

    private final String expectedClientId;

    public WorkOsClientIdValidator(String expectedClientId) {
        this.expectedClientId = expectedClientId;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        String clientId = token.getClaimAsString("client_id");
        if (expectedClientId != null && !expectedClientId.isBlank() && expectedClientId.equals(clientId)) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(INVALID_CLIENT);
    }
}
