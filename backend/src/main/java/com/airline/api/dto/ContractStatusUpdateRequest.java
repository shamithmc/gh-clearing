package com.airline.api.dto;

import com.airline.domain.ContractStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ContractStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private ContractStatus status;
}
