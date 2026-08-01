package com.airline.api.dto;

public record BrowserAuthConfigResponse(
        boolean enabled,
        String issuerUri,
        String clientId) {
}
