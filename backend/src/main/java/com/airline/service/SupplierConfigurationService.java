package com.airline.service;

import com.airline.api.dto.SupplierConfigurationRequest;
import com.airline.domain.SupplierConfiguration;
import com.airline.domain.Tenant;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;

@Service
@RequiredArgsConstructor
public class SupplierConfigurationService {

    private final SupplierConfigurationRepository supplierConfigurationRepository;
    private final TenantRepository tenantRepository;

    @Transactional
    public SupplierConfiguration getConfiguration(String tenantId) {
        verifyTenantIsGroundHandler(tenantId);
        return supplierConfigurationRepository.findById(tenantId)
                .orElseGet(() -> createDefaultConfiguration(tenantId));
    }

    @Transactional
    public SupplierConfiguration updateConfiguration(String tenantId, SupplierConfigurationRequest request) {
        verifyTenantIsGroundHandler(tenantId);
        
        SupplierConfiguration config = supplierConfigurationRepository.findById(tenantId)
                .orElseGet(() -> SupplierConfiguration.builder()
                        .tenantId(tenantId)
                        .enabledAirlines(new HashSet<>())
                        .enabledAirports(new HashSet<>())
                        .build());
        
        config.setEmailIds(request.getEmailIds());
        
        if (request.getInvoiceBackdatingDays() != null) {
            config.setInvoiceBackdatingDays(request.getInvoiceBackdatingDays());
        }
        
        config.setRegionalClassification(request.getRegionalClassification());
        
        if (request.getEnabledAirlines() != null) {
            config.getEnabledAirlines().clear();
            config.getEnabledAirlines().addAll(request.getEnabledAirlines());
        }
        
        if (request.getEnabledAirports() != null) {
            config.getEnabledAirports().clear();
            config.getEnabledAirports().addAll(request.getEnabledAirports());
        }
        
        return supplierConfigurationRepository.save(config);
    }

    private SupplierConfiguration createDefaultConfiguration(String tenantId) {
        SupplierConfiguration config = SupplierConfiguration.builder()
                .tenantId(tenantId)
                .invoiceBackdatingDays(30)
                .build();
        return supplierConfigurationRepository.save(config);
    }
    
    private void verifyTenantIsGroundHandler(String tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId));
                
        if (tenant.getType() != Tenant.TenantType.GROUND_HANDLER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supplier configuration is only applicable to GROUND_HANDLER tenants.");
        }
    }
}
