package com.airline.api.dto;

import com.airline.domain.User;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.Set;

@Data
public class UserResponse {
    private String id;
    private String tenantId;
    private String username;
    private String email;
    private Set<String> roles;
    private OffsetDateTime createdAt;

    public static UserResponse from(User u) {
        UserResponse r = new UserResponse();
        r.setId(u.getId());
        r.setTenantId(u.getTenantId());
        r.setUsername(u.getUsername());
        r.setEmail(u.getEmail());
        r.setRoles(u.getRoles());
        r.setCreatedAt(u.getCreatedAt());
        return r;
    }
}
