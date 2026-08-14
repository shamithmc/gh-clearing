package com.airline.service;

import com.airline.api.dto.OperationalFlightRequest;
import com.airline.domain.OperationalFlight;
import com.airline.repository.OperationalFlightRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class OperationalFlightService {
    private final OperationalFlightRepository repository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensions;

    public OperationalFlightService(OperationalFlightRepository repository,
                                    TenantContext tenantContext,
                                    DimensionalSecurityEvaluator dimensions) {
        this.repository = repository;
        this.tenantContext = tenantContext;
        this.dimensions = dimensions;
    }

    @Transactional
    public OperationalFlight record(OperationalFlightRequest request) {
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only ground handlers can record operational flights");
        }
        requireRole("INVOICE_ENTRY");
        String supplierId = tenantContext.getCurrentTenantId();
        String airlineId = normalize(request.getAirlineId());
        String airportCode = normalize(request.getAirportCode());
        dimensions.verifyAccess(airportCode, airlineId, Set.of());
        repository.findByIdAndSupplierId(request.getId(), supplierId).ifPresent(existing -> {
            throw new IllegalStateException("Operational flight already exists: " + existing.getId());
        });
        return repository.save(OperationalFlight.builder()
                .id(request.getId().trim())
                .supplierId(supplierId)
                .airlineId(airlineId)
                .airportCode(airportCode)
                .flightNumber(normalize(request.getFlightNumber()))
                .flightDate(request.getFlightDate())
                .tailId(normalize(request.getTailId()))
                .aircraftType(normalizeOptional(request.getAircraftType()))
                .departureAirport(normalize(request.getDepartureAirport()))
                .destinationAirport(normalize(request.getDestinationAirport()))
                .quantityDrivers(request.getQuantityDrivers())
                .build());
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : normalize(value);
    }

    private void requireRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> role.equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: " + role);
        }
    }
}
