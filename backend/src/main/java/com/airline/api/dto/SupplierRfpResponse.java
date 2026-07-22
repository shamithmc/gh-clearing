package com.airline.api.dto;

import com.airline.domain.RfpProposalStatus;
import com.airline.domain.RfpStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
public class SupplierRfpResponse {
    private String id;
    private String airlineId;
    private String airportCode;
    private String serviceType;
    private String requirements;
    private LocalDate desiredStartDate;
    private LocalDate desiredEndDate;
    private RfpStatus status;
    private OffsetDateTime createdAt;
    private String proposalId;
    private RfpProposalStatus proposalStatus;
    private BigDecimal proposedRate;
    private String proposalCurrency;
    private String proposalTerms;
}
