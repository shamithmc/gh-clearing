package com.airline.api.dto;

import java.util.Set;

public record AuthenticatedUserResponse(
        String id,
        String tenantId,
        String tenantType,
        String username,
        String email,
        Set<String> roles) {
}
