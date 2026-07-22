package com.airline.api.dto;

import com.airline.domain.RfpStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;

@Data
@Builder
public class RfpResponse {
    private String id;
    private String airlineId;
    private String airportCode;
    private String serviceType;
    private String requirements;
    private LocalDate desiredStartDate;
    private LocalDate desiredEndDate;
    private RfpStatus status;
    private Set<String> eligibleGroundHandlerIds;
    private OffsetDateTime createdAt;
}
