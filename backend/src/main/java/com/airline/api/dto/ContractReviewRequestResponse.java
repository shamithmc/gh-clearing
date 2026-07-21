package com.airline.api.dto;

import com.airline.domain.ContractStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractReviewRequestResponse {
    private String id;
    private String contractId;
    private String groundHandlerId;
    private String airlineId;
    private String airportCode;
    private ContractStatus contractStatus;
    private String comment;
    private String requestedBy;
    private OffsetDateTime createdAt;
}
