package com.airline.api;

import com.airline.api.dto.PricingBenchmarkResponse;
import com.airline.service.PricingBenchmarkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/market-intelligence")
public class PricingBenchmarkController {

    private final PricingBenchmarkService pricingBenchmarkService;

    public PricingBenchmarkController(PricingBenchmarkService pricingBenchmarkService) {
        this.pricingBenchmarkService = pricingBenchmarkService;
    }

    @GetMapping("/pricing-benchmarks")
    public ResponseEntity<List<PricingBenchmarkResponse>> getPricingBenchmarks(
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String aircraftType,
            @RequestParam(required = false) String operationType) {
        return ResponseEntity.ok(pricingBenchmarkService.getBenchmarks(
                airportCode, region, serviceType, aircraftType, operationType));
    }
}
