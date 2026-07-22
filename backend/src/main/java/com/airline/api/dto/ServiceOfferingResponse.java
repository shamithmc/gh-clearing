package com.airline.api.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class ServiceOfferingResponse {
    private String id;
    private String supplierId;
    private String airportCode;
    private String airportName;
    private String country;
    private String region;
    private String serviceType;
    private String serviceName;
    private String description;
    private OffsetDateTime createdAt;
}
