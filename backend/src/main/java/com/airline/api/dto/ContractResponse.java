package com.airline.api.dto;

import com.airline.domain.ContractStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
public class ContractResponse {
    private String id;
    private String groundHandlerId;
    private String airlineId;
    private String airportCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private ContractStatus status;
    private String currency;
    private OffsetDateTime createdAt;
    private List<ServiceConfigurationDTO> services;
}
