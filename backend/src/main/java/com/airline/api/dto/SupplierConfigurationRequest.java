package com.airline.api.dto;

import lombok.Data;
import jakarta.validation.constraints.Min;
import java.util.Set;

@Data
public class SupplierConfigurationRequest {
    private String emailIds;

    @Min(0)
    private Integer invoiceBackdatingDays;

    private String regionalClassification;
    private Set<String> enabledAirlines;
    private Set<String> enabledAirports;
}
