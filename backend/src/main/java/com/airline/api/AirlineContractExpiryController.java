package com.airline.api;

import com.airline.api.dto.AirlineContractExpiryResponse;
import com.airline.service.AirlineContractExpiryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/airline/reports")
public class AirlineContractExpiryController {

    private final AirlineContractExpiryService contractExpiryService;

    public AirlineContractExpiryController(AirlineContractExpiryService contractExpiryService) {
        this.contractExpiryService = contractExpiryService;
    }

    @GetMapping("/contract-expiry")
    public ResponseEntity<AirlineContractExpiryResponse> getContractExpiry(
            @RequestParam(required = false) String supplierId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType,
            @RequestParam(defaultValue = "90") int horizonDays) {
        return ResponseEntity.ok(contractExpiryService.getContractExpiry(
                supplierId, airportCode, serviceType, horizonDays));
    }
}
