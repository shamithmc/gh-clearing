package com.airline.api;

import com.airline.api.dto.AirlineExpectedBillingResponse;
import com.airline.service.AirlineExpectedBillingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/airline/reports")
public class AirlineExpectedBillingController {

    private final AirlineExpectedBillingService expectedBillingService;

    public AirlineExpectedBillingController(AirlineExpectedBillingService expectedBillingService) {
        this.expectedBillingService = expectedBillingService;
    }

    @GetMapping("/expected-billing")
    public ResponseEntity<AirlineExpectedBillingResponse> getExpectedBilling(
            @RequestParam(required = false) String supplierId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(expectedBillingService.getExpectedBilling(
                supplierId, airportCode, serviceType, startDate, endDate));
    }
}
