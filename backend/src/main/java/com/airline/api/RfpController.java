package com.airline.api;

import com.airline.api.dto.RfpCreateRequest;
import com.airline.api.dto.RfpResponse;
import com.airline.service.RfpService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rfps")
public class RfpController {

    private final RfpService rfpService;

    public RfpController(RfpService rfpService) {
        this.rfpService = rfpService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RfpResponse create(@Valid @RequestBody RfpCreateRequest request) {
        return rfpService.create(request);
    }

    @GetMapping
    public List<RfpResponse> listOwn() {
        return rfpService.listOwn();
    }
}
