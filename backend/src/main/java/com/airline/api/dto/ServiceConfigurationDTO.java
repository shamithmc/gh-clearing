package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class ServiceConfigurationDTO {

    @NotBlank
    private String chargeCode;

    @NotBlank
    private String serviceName;

    @NotBlank
    private String formulaType;

    @NotNull
    private Map<String, Object> rateDetails;

    @NotBlank
    private String quantityDriver;

    @NotBlank
    private String uom;

    private String taxCode;
}
