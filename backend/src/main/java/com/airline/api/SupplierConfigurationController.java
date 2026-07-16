package com.airline.api;

import com.airline.api.dto.SupplierConfigurationRequest;
import com.airline.api.dto.SupplierConfigurationResponse;
import com.airline.service.SupplierConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tenants/{tenantId}/configuration")
@RequiredArgsConstructor
public class SupplierConfigurationController {

    private final SupplierConfigurationService supplierConfigurationService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'GROUND_HANDLER_ADMIN')")
    public ResponseEntity<SupplierConfigurationResponse> getConfiguration(@PathVariable String tenantId) {
        return ResponseEntity.ok(SupplierConfigurationResponse.from(supplierConfigurationService.getConfiguration(tenantId)));
    }

    @PutMapping
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'GROUND_HANDLER_ADMIN')")
    public ResponseEntity<SupplierConfigurationResponse> updateConfiguration(
            @PathVariable String tenantId,
            @Valid @RequestBody SupplierConfigurationRequest request) {
        return ResponseEntity.ok(SupplierConfigurationResponse.from(supplierConfigurationService.updateConfiguration(tenantId, request)));
    }
}
