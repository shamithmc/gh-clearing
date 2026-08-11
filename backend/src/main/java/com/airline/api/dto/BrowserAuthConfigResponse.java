package com.airline.api.dto;

public record BrowserAuthConfigResponse(
        boolean enabled,
        String apiHostname,
        String clientId) {
}
