package com.airline.api;

import com.airline.api.dto.OperationalFlightRequest;
import com.airline.domain.OperationalFlight;
import com.airline.service.OperationalFlightService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operational-flights")
public class OperationalFlightController {
    private final OperationalFlightService service;

    public OperationalFlightController(OperationalFlightService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OperationalFlight> record(@Valid @RequestBody OperationalFlightRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.record(request));
    }
}
