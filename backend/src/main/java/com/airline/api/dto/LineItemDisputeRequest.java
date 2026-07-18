package com.airline.api.dto;

import com.airline.domain.DisputeCategory;
import lombok.Data;

@Data
public class LineItemDisputeRequest {
    private String lineItemId;
    private DisputeCategory category;
    private String comment;
}
