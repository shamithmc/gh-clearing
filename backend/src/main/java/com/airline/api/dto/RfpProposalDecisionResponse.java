package com.airline.api.dto;

import com.airline.domain.RfpProposalStatus;
import com.airline.domain.RfpStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RfpProposalDecisionResponse {
    private String proposalId;
    private RfpProposalStatus proposalStatus;
    private RfpStatus rfpStatus;
    private String seededContractId;
}
