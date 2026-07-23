package com.airline.api;

import com.airline.api.dto.AirportCostIndexResponse;
import com.airline.service.AirportCostIndexService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/market-intelligence")
public class AirportCostIndexController {

    private final AirportCostIndexService airportCostIndexService;

    public AirportCostIndexController(AirportCostIndexService airportCostIndexService) {
        this.airportCostIndexService = airportCostIndexService;
    }

    @GetMapping("/airport-cost-index")
    public ResponseEntity<List<AirportCostIndexResponse>> getAirportCostIndex(
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String aircraftType,
            @RequestParam(required = false) String operationType) {
        return ResponseEntity.ok(airportCostIndexService.getIndex(
                airportCode, region, serviceType, aircraftType, operationType));
    }
}
