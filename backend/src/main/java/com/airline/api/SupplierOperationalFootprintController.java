package com.airline.api;

import com.airline.api.dto.SupplierOperationalFootprintResponse;
import com.airline.service.SupplierOperationalFootprintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/supplier/reports")
public class SupplierOperationalFootprintController {

    private final SupplierOperationalFootprintService operationalFootprintService;

    public SupplierOperationalFootprintController(
            SupplierOperationalFootprintService operationalFootprintService) {
        this.operationalFootprintService = operationalFootprintService;
    }

    @GetMapping("/operational-footprint")
    public ResponseEntity<SupplierOperationalFootprintResponse> getOperationalFootprint(
            @RequestParam(required = false) String airlineId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) String currency) {
        return ResponseEntity.ok(operationalFootprintService.getOperationalFootprint(
                airlineId, airportCode, serviceType, currency));
    }
}
