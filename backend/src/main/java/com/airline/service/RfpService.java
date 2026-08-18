package com.airline.service;

import com.airline.api.dto.RfpCreateRequest;
import com.airline.api.dto.RfpResponse;
import com.airline.domain.Rfp;
import com.airline.domain.RfpStatus;
import com.airline.repository.RfpRepository;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
public class RfpService {

    private final RfpRepository rfpRepository;
    private final SupplierConfigurationRepository supplierConfigurationRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    private final ReferenceDataService referenceDataService;

    public RfpService(
            RfpRepository rfpRepository,
            SupplierConfigurationRepository supplierConfigurationRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator,
            ReferenceDataService referenceDataService) {
        this.rfpRepository = rfpRepository;
        this.supplierConfigurationRepository = supplierConfigurationRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
        this.referenceDataService = referenceDataService;
    }

    @Transactional
    public RfpResponse create(RfpCreateRequest request) {
        String airlineId = requireAirlineRfpRaiser();
        String airportCode = normalize(request.getAirportCode());
        String serviceType = normalize(request.getServiceType());
        validatePeriod(request);

        referenceDataService.getAirport(airportCode);
        referenceDataService.getChargeCode(serviceType);
        dimensionalSecurityEvaluator.verifyAccess(airportCode, airlineId, Set.of(serviceType));

        Set<String> eligibleGroundHandlers = supplierConfigurationRepository
                .findEligibleGroundHandlerIds(airportCode, airlineId);
        Rfp rfp = Rfp.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(airlineId)
                .airlineId(airlineId)
                .airportCode(airportCode)
                .serviceType(serviceType)
                .requirements(request.getRequirements().trim())
                .desiredStartDate(request.getDesiredStartDate())
                .desiredEndDate(request.getDesiredEndDate())
                .status(RfpStatus.PUBLISHED)
                .createdBy(currentUserId())
                .createdAt(OffsetDateTime.now())
                .eligibleGroundHandlerIds(Set.copyOf(eligibleGroundHandlers))
                .build();
        return toResponse(rfpRepository.save(rfp));
    }

    @Transactional
    public RfpResponse update(String rfpId, RfpCreateRequest request) {
        String airlineId = requireAirlineRfpRaiser();
        Rfp rfp = rfpRepository.findByIdAndTenantId(rfpId, airlineId)
                .orElseThrow(() -> new NoSuchElementException("RFP not found: " + rfpId));

        if (rfp.getStatus() == RfpStatus.AWARDED || rfp.getStatus() == RfpStatus.CLOSED) {
            throw new IllegalStateException("Awarded or closed RFPs cannot be modified");
        }

        String airportCode = normalize(request.getAirportCode());
        String serviceType = normalize(request.getServiceType());
        validatePeriod(request);

        referenceDataService.getAirport(airportCode);
        referenceDataService.getChargeCode(serviceType);
        dimensionalSecurityEvaluator.verifyAccess(airportCode, airlineId, Set.of(serviceType));

        Set<String> eligibleGroundHandlers = supplierConfigurationRepository
                .findEligibleGroundHandlerIds(airportCode, airlineId);

        rfp.setAirportCode(airportCode);
        rfp.setServiceType(serviceType);
        rfp.setRequirements(request.getRequirements().trim());
        rfp.setDesiredStartDate(request.getDesiredStartDate());
        rfp.setDesiredEndDate(request.getDesiredEndDate());
        if (rfp.getEligibleGroundHandlerIds() == null) {
            rfp.setEligibleGroundHandlerIds(new HashSet<>(eligibleGroundHandlers));
        } else {
            rfp.getEligibleGroundHandlerIds().clear();
            rfp.getEligibleGroundHandlerIds().addAll(eligibleGroundHandlers);
        }

        return toResponse(rfpRepository.save(rfp));
    }

    @Transactional(readOnly = true)
    public List<RfpResponse> listOwn() {
        String airlineId = requireAirlineRfpRaiser();
        return rfpRepository.findAllByTenantIdOrderByCreatedAtDesc(airlineId).stream()
                .map(this::toResponse)
                .toList();
    }

    private String requireAirlineRfpRaiser() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only airlines can create and view airline RFPs");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "RFP_RAISER".equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: RFP_RAISER");
        }
        return tenantContext.getCurrentTenantId();
    }

    private void validatePeriod(RfpCreateRequest request) {
        if (request.getDesiredStartDate() == null || request.getDesiredEndDate() == null) {
            throw new IllegalArgumentException("Desired contract period is required");
        }
        if (request.getDesiredEndDate().isBefore(request.getDesiredStartDate())) {
            throw new IllegalArgumentException("Desired contract end date cannot be before start date");
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    private RfpResponse toResponse(Rfp rfp) {
        return RfpResponse.builder()
                .id(rfp.getId())
                .airlineId(rfp.getAirlineId())
                .airportCode(rfp.getAirportCode())
                .serviceType(rfp.getServiceType())
                .requirements(rfp.getRequirements())
                .desiredStartDate(rfp.getDesiredStartDate())
                .desiredEndDate(rfp.getDesiredEndDate())
                .status(rfp.getStatus())
                .eligibleGroundHandlerIds(Set.copyOf(rfp.getEligibleGroundHandlerIds()))
                .createdAt(rfp.getCreatedAt())
                .build();
    }
}
