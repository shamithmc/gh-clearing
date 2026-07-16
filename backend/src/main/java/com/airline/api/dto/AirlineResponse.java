package com.airline.api.dto;

import com.airline.domain.Airline;
import lombok.Data;

@Data
public class AirlineResponse {
    private String iataCode;
    private String name;
    private String country;

    public static AirlineResponse from(Airline a) {
        AirlineResponse r = new AirlineResponse();
        r.setIataCode(a.getIataCode());
        r.setName(a.getName());
        r.setCountry(a.getCountry());
        return r;
    }
}
