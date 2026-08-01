package com.airline.service;

import com.airline.api.dto.ServiceOfferingCreateRequest;
import com.airline.api.dto.ServiceOfferingResponse;
import com.airline.domain.Airport;
import com.airline.domain.ChargeCode;
import com.airline.domain.ServiceOffering;
import com.airline.domain.SupplierConfiguration;
import com.airline.repository.AirportRepository;
import com.airline.repository.ChargeCodeRepository;
import com.airline.repository.ServiceOfferingRepository;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class ServiceMarketplaceService {

    private final ServiceOfferingRepository offeringRepository;
    private final SupplierConfigurationRepository supplierConfigurationRepository;
    private final AirportRepository airportRepository;
    private final ChargeCodeRepository chargeCodeRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public ServiceMarketplaceService(
            ServiceOfferingRepository offeringRepository,
            SupplierConfigurationRepository supplierConfigurationRepository,
            AirportRepository airportRepository,
            ChargeCodeRepository chargeCodeRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.offeringRepository = offeringRepository;
        this.supplierConfigurationRepository = supplierConfigurationRepository;
        this.airportRepository = airportRepository;
        this.chargeCodeRepository = chargeCodeRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public List<ServiceOfferingResponse> listOwnOfferings() {
        String supplierId = requireRole("GROUND_HANDLER", "RFP_MONITOR");
        return offeringRepository.findAllByTenantIdOrderByAirportCodeAscServiceTypeAsc(supplierId).stream()
                .filter(this::isOfferingDimensionallyPermitted)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ServiceOfferingResponse createOffering(ServiceOfferingCreateRequest request) {
        String supplierId = requireRole("GROUND_HANDLER", "RFP_MONITOR");
        String airportCode = request.getAirportCode().trim().toUpperCase(Locale.ROOT);
        String serviceType = request.getServiceType().trim().toUpperCase(Locale.ROOT);

        Airport airport = airportRepository.findById(airportCode)
                .orElseThrow(() -> new NoSuchElementException("Airport not found: " + airportCode));
        ChargeCode chargeCode = chargeCodeRepository.findById(serviceType)
                .orElseThrow(() -> new NoSuchElementException("Service type not found: " + serviceType));
        verifyOfferingDimensions(airportCode, serviceType);

        SupplierConfiguration configuration = supplierConfigurationRepository.findByTenantId(supplierId)
                .orElseThrow(() -> new IllegalStateException("Supplier configuration is required"));
        if (!configuration.getEnabledAirports().contains(airportCode)) {
            throw new AccessDeniedException("Supplier is not configured to operate at airport: " + airportCode);
        }
        if (offeringRepository.existsByTenantIdAndAirportCodeAndServiceType(
                supplierId, airportCode, serviceType)) {
            throw new IllegalStateException("This service is already listed for the airport");
        }

        ServiceOffering offering = ServiceOffering.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(supplierId)
                .airportCode(airport.getIataCode())
                .serviceType(chargeCode.getCode())
                .description(request.getDescription().trim())
                .build();
        return toResponse(offeringRepository.save(offering));
    }

    @Transactional
    public void deleteOffering(String offeringId) {
        String supplierId = requireRole("GROUND_HANDLER", "RFP_MONITOR");
        ServiceOffering offering = offeringRepository.findByIdAndTenantId(offeringId, supplierId)
                .orElseThrow(() -> new NoSuchElementException("Service offering not found"));
        verifyOfferingDimensions(offering.getAirportCode(), offering.getServiceType());
        offeringRepository.delete(offering);
    }

    @Transactional(readOnly = true)
    public List<ServiceOfferingResponse> browseMarketplace(
            String airportCode, String region, String serviceType) {
        String airlineId = requireRole("AIRLINE", "RFP_RAISER");
        String normalizedAirport = normalize(airportCode);
        String normalizedRegion = normalize(region);
        String normalizedService = normalize(serviceType);

        return offeringRepository.findMarketplaceOfferings(airlineId).stream()
                .filter(offering -> normalizedAirport == null
                        || offering.getAirportCode().equals(normalizedAirport))
                .filter(offering -> normalizedService == null
                        || offering.getServiceType().equals(normalizedService))
                .filter(offering -> normalizedRegion == null
                        || airport(offering.getAirportCode()).getRegion().equalsIgnoreCase(normalizedRegion))
                .filter(offering -> dimensionalSecurityEvaluator.isAirportPermitted(offering.getAirportCode()))
                .filter(offering -> dimensionalSecurityEvaluator.isAirlinePermitted(airlineId))
                .filter(offering -> dimensionalSecurityEvaluator.isChargeCodePermitted(offering.getServiceType()))
                .map(this::toResponse)
                .toList();
    }

    private String requireRole(String tenantType, String authority) {
        if (!tenantType.equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("This marketplace operation is not available to the current tenant type");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(granted -> authority.equals(granted.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: " + authority);
        }
        return tenantContext.getCurrentTenantId();
    }

    private boolean isOfferingDimensionallyPermitted(ServiceOffering offering) {
        return dimensionalSecurityEvaluator.isAirportPermitted(offering.getAirportCode())
                && dimensionalSecurityEvaluator.isChargeCodePermitted(offering.getServiceType());
    }

    private void verifyOfferingDimensions(String airportCode, String serviceType) {
        if (!dimensionalSecurityEvaluator.isAirportPermitted(airportCode)) {
            throw new AccessDeniedException("User is restricted from accessing airport: " + airportCode);
        }
        if (!dimensionalSecurityEvaluator.isChargeCodePermitted(serviceType)) {
            throw new AccessDeniedException("User is restricted from accessing service type: " + serviceType);
        }
    }

    private ServiceOfferingResponse toResponse(ServiceOffering offering) {
        Airport airport = airport(offering.getAirportCode());
        ChargeCode chargeCode = chargeCodeRepository.findById(offering.getServiceType())
                .orElseThrow(() -> new IllegalStateException(
                        "Service offering references an unknown service type: " + offering.getServiceType()));
        return ServiceOfferingResponse.builder()
                .id(offering.getId())
                .supplierId(offering.getTenantId())
                .airportCode(airport.getIataCode())
                .airportName(airport.getName())
                .country(airport.getCountry())
                .region(airport.getRegion())
                .serviceType(chargeCode.getCode())
                .serviceName(chargeCode.getDisplayName())
                .description(offering.getDescription())
                .createdAt(offering.getCreatedAt())
                .build();
    }

    private Airport airport(String airportCode) {
        return airportRepository.findById(airportCode)
                .orElseThrow(() -> new IllegalStateException(
                        "Service offering references an unknown airport: " + airportCode));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
