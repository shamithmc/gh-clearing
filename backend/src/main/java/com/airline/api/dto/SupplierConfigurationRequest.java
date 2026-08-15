package com.airline.api.dto;

import lombok.Data;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

@Data
public class SupplierConfigurationRequest {
    @Size(max = 255)
    private String emailIds;

    @Min(0)
    private Integer invoiceBackdatingDays;

    @Size(max = 50)
    private String regionalClassification;
    private Set<@Pattern(regexp = "[A-Z0-9]{2}") String> enabledAirlines;
    private Set<@Pattern(regexp = "[A-Z]{3}") String> enabledAirports;
}
