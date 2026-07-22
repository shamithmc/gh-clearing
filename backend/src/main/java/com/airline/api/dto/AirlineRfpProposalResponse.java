package com.airline.api.dto;

import com.airline.domain.RfpProposalStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
public class AirlineRfpProposalResponse {
    private String id;
    private String rfpId;
    private String groundHandlerId;
    private BigDecimal proposedRate;
    private String currency;
    private String terms;
    private RfpProposalStatus status;
    private OffsetDateTime submittedAt;
}
