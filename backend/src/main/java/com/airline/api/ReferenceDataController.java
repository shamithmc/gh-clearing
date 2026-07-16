package com.airline.api;

import com.airline.api.dto.AirlineResponse;
import com.airline.api.dto.AirportResponse;
import com.airline.api.dto.ChargeCodeResponse;
import com.airline.service.ReferenceDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reference")
@RequiredArgsConstructor
public class ReferenceDataController {

    private final ReferenceDataService referenceDataService;

    // --- Charge Codes ---

    @GetMapping("/charge-codes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChargeCodeResponse>> listChargeCodes() {
        return ResponseEntity.ok(
                referenceDataService.listChargeCodes().stream()
                        .map(ChargeCodeResponse::from)
                        .toList()
        );
    }

    @GetMapping("/charge-codes/{code}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ChargeCodeResponse> getChargeCode(@PathVariable String code) {
        return ResponseEntity.ok(ChargeCodeResponse.from(referenceDataService.getChargeCode(code)));
    }

    // --- Airlines ---

    @GetMapping("/airlines")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AirlineResponse>> listAirlines() {
        return ResponseEntity.ok(
                referenceDataService.listAirlines().stream()
                        .map(AirlineResponse::from)
                        .toList()
        );
    }

    @GetMapping("/airlines/{iataCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AirlineResponse> getAirline(@PathVariable String iataCode) {
        return ResponseEntity.ok(AirlineResponse.from(referenceDataService.getAirline(iataCode)));
    }

    // --- Airports ---

    @GetMapping("/airports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<AirportResponse>> listAirports(
            @RequestParam(required = false) String region) {
        if (region != null) {
            return ResponseEntity.ok(
                    referenceDataService.listAirportsByRegion(region).stream()
                            .map(AirportResponse::from)
                            .toList()
            );
        }
        return ResponseEntity.ok(
                referenceDataService.listAirports().stream()
                        .map(AirportResponse::from)
                        .toList()
        );
    }

    @GetMapping("/airports/{iataCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AirportResponse> getAirport(@PathVariable String iataCode) {
        return ResponseEntity.ok(AirportResponse.from(referenceDataService.getAirport(iataCode)));
    }
}
