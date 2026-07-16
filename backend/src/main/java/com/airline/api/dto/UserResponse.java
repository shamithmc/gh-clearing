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
    private Set<String> airportRestrictions;
    private Set<String> airlineRestrictions;
    private Set<String> chargeCodeRestrictions;
    private OffsetDateTime createdAt;

    public static UserResponse from(User u) {
        UserResponse r = new UserResponse();
        r.setId(u.getId());
        r.setTenantId(u.getTenantId());
        r.setUsername(u.getUsername());
        r.setEmail(u.getEmail());
        r.setRoles(u.getRoles());
        r.setAirportRestrictions(u.getAirportRestrictions());
        r.setAirlineRestrictions(u.getAirlineRestrictions());
        r.setChargeCodeRestrictions(u.getChargeCodeRestrictions());
        r.setCreatedAt(u.getCreatedAt());
        return r;
    }
}
