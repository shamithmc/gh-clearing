package com.airline.api.dto;

import com.airline.domain.Tenant;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class TenantResponse {
    private String id;
    private String name;
    private Tenant.TenantType type;
    private Tenant.TenantStatus status;
    private OffsetDateTime createdAt;

    public static TenantResponse from(Tenant t) {
        TenantResponse r = new TenantResponse();
        r.setId(t.getId());
        r.setName(t.getName());
        r.setType(t.getType());
        r.setStatus(t.getStatus());
        r.setCreatedAt(t.getCreatedAt());
        return r;
    }
}
