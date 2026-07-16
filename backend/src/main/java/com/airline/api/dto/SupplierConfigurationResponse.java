package com.airline.api.dto;

import com.airline.domain.SupplierConfiguration;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.Set;

@Data
public class SupplierConfigurationResponse {
    private String tenantId;
    private String emailIds;
    private Integer invoiceBackdatingDays;
    private String regionalClassification;
    private Set<String> enabledAirlines;
    private Set<String> enabledAirports;
    private OffsetDateTime createdAt;

    public static SupplierConfigurationResponse from(SupplierConfiguration c) {
        SupplierConfigurationResponse r = new SupplierConfigurationResponse();
        r.setTenantId(c.getTenantId());
        r.setEmailIds(c.getEmailIds());
        r.setInvoiceBackdatingDays(c.getInvoiceBackdatingDays());
        r.setRegionalClassification(c.getRegionalClassification());
        r.setEnabledAirlines(c.getEnabledAirlines());
        r.setEnabledAirports(c.getEnabledAirports());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }
}
