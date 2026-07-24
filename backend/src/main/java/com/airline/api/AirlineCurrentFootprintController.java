package com.airline.api;

import com.airline.api.dto.AirlineCurrentFootprintResponse;
import com.airline.service.AirlineCurrentFootprintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/airline/reports")
public class AirlineCurrentFootprintController {

    private final AirlineCurrentFootprintService currentFootprintService;

    public AirlineCurrentFootprintController(
            AirlineCurrentFootprintService currentFootprintService) {
        this.currentFootprintService = currentFootprintService;
    }

    @GetMapping("/current-footprint")
    public ResponseEntity<AirlineCurrentFootprintResponse> getCurrentFootprint(
            @RequestParam(required = false) String supplierId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String currency,
            @RequestParam(defaultValue = "12") int historyMonths) {
        return ResponseEntity.ok(currentFootprintService.getCurrentFootprint(
                supplierId, airportCode, serviceType, currency, historyMonths));
    }
}
