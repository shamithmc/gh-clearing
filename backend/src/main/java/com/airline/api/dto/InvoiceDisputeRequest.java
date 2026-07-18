package com.airline.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class InvoiceDisputeRequest {
    private List<LineItemDisputeRequest> lineItems;
}
