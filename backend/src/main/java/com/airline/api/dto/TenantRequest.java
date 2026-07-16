package com.airline.api.dto;

import com.airline.domain.Tenant;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class TenantRequest {

    @NotBlank
    private String id;

    @NotBlank
    private String name;

    @NotNull
    private Tenant.TenantType type;
}
