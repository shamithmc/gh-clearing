package com.airline.api.dto;

import com.airline.domain.RfpProposalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RfpProposalDecisionRequest {
    @NotNull
    private RfpProposalStatus status;
    private boolean seedContract;
}
