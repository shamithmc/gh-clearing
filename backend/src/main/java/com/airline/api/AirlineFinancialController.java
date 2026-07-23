package com.airline.api;

import com.airline.api.dto.AirlineBilledAmountsResponse;
import com.airline.service.AirlineFinancialService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/airline/reports")
public class AirlineFinancialController {

    private final AirlineFinancialService airlineFinancialService;

    public AirlineFinancialController(AirlineFinancialService airlineFinancialService) {
        this.airlineFinancialService = airlineFinancialService;
    }

    @GetMapping("/billed-amounts")
    public ResponseEntity<AirlineBilledAmountsResponse> getBilledAmounts(
            @RequestParam(required = false) String supplierId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(airlineFinancialService.getBilledAmounts(
                supplierId, airportCode, serviceType, startDate, endDate));
    }
}
