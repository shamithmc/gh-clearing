package com.airline.api.dto;

import com.airline.domain.Airport;
import lombok.Data;

@Data
public class AirportResponse {
    private String iataCode;
    private String name;
    private String city;
    private String country;
    private String region;
    private java.math.BigDecimal latitude;
    private java.math.BigDecimal longitude;

    public static AirportResponse from(Airport a) {
        AirportResponse r = new AirportResponse();
        r.setIataCode(a.getIataCode());
        r.setName(a.getName());
        r.setCity(a.getCity());
        r.setCountry(a.getCountry());
        r.setRegion(a.getRegion());
        r.setLatitude(a.getLatitude());
        r.setLongitude(a.getLongitude());
        return r;
    }
}
