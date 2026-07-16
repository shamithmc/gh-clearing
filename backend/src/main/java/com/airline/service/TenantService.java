package com.airline.service;

import com.airline.api.dto.TenantRequest;
import com.airline.domain.Tenant;
import com.airline.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    public Tenant createTenant(TenantRequest request) {
        if (tenantRepository.existsById(request.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tenant with id '" + request.getId() + "' already exists");
        }
        Tenant tenant = Tenant.builder()
                .id(request.getId())
                .name(request.getName())
                .type(request.getType())
                .status(Tenant.TenantStatus.ACTIVE)
                .build();
        return tenantRepository.save(tenant);
    }

    public List<Tenant> listTenants() {
        return tenantRepository.findAll();
    }

    public Tenant getTenant(String id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tenant not found: " + id));
    }
}
