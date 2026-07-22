package com.airline.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RfpProposalCreateRequest {

    @NotNull
    @Positive
    private BigDecimal proposedRate;

    @NotBlank
    @Pattern(regexp = "[A-Za-z]{3}")
    private String currency;

    @NotBlank
    @Size(max = 4000)
    private String terms;
}
