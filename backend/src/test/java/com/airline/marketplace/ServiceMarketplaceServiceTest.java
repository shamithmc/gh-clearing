package com.airline.marketplace;

import com.airline.api.dto.ServiceOfferingCreateRequest;
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
import com.airline.service.ServiceMarketplaceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceMarketplaceServiceTest {

    @Mock
    private ServiceOfferingRepository offeringRepository;
    @Mock
    private SupplierConfigurationRepository supplierConfigurationRepository;
    @Mock
    private AirportRepository airportRepository;
    @Mock
    private ChargeCodeRepository chargeCodeRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private ServiceMarketplaceService service;

    @BeforeEach
    void setUp() {
        service = new ServiceMarketplaceService(offeringRepository, supplierConfigurationRepository,
                airportRepository, chargeCodeRepository, tenantContext, dimensionalSecurityEvaluator);
        supplierAuthentication();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void supplierListUsesTenantDiscriminatorAndFiltersUserDimensions() {
        ServiceOffering dxb = offering("offering-1", "SWISSPORT", "DXB", "BAGGAGE");
        ServiceOffering lhr = offering("offering-2", "SWISSPORT", "LHR", "BAGGAGE");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(offeringRepository.findAllByTenantIdOrderByAirportCodeAscServiceTypeAsc("SWISSPORT"))
                .thenReturn(List.of(dxb, lhr));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("LHR")).thenReturn(false);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        stubReferences("DXB", "BAGGAGE");

        var result = service.listOwnOfferings();

        assertThat(result).singleElement()
                .satisfies(response -> {
                    assertThat(response.getSupplierId()).isEqualTo("SWISSPORT");
                    assertThat(response.getAirportCode()).isEqualTo("DXB");
                });
    }

    @Test
    void supplierCreatesOfferingOnlyForConfiguredAirportAndClosedVocabularies() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        SupplierConfiguration configuration = SupplierConfiguration.builder()
                .tenantId("SWISSPORT")
                .enabledAirports(new HashSet<>(java.util.Set.of("DXB")))
                .build();
        when(supplierConfigurationRepository.findByTenantId("SWISSPORT"))
                .thenReturn(Optional.of(configuration));
        when(offeringRepository.existsByTenantIdAndAirportCodeAndServiceType(
                "SWISSPORT", "DXB", "BAGGAGE")).thenReturn(false);
        when(offeringRepository.save(any(ServiceOffering.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        stubReferences("DXB", "BAGGAGE");

        var response = service.createOffering(request("dxb", "baggage"));

        assertThat(response.getSupplierId()).isEqualTo("SWISSPORT");
        ArgumentCaptor<ServiceOffering> captor = ArgumentCaptor.forClass(ServiceOffering.class);
        verify(offeringRepository).save(captor.capture());
        assertThat(captor.getValue()).satisfies(offering -> {
            assertThat(offering.getTenantId()).isEqualTo("SWISSPORT");
            assertThat(offering.getAirportCode()).isEqualTo("DXB");
            assertThat(offering.getServiceType()).isEqualTo("BAGGAGE");
        });
    }

    @Test
    void supplierCannotPublishAtUnconfiguredAirport() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(supplierConfigurationRepository.findByTenantId("SWISSPORT"))
                .thenReturn(Optional.of(SupplierConfiguration.builder()
                        .tenantId("SWISSPORT")
                        .enabledAirports(new HashSet<>())
                        .build()));
        stubReferences("DXB", "BAGGAGE");

        assertThatThrownBy(() -> service.createOffering(request("DXB", "BAGGAGE")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not configured");
        verify(offeringRepository, never()).save(any());
    }

    @Test
    void supplierCannotDeleteAnotherTenantsOffering() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(offeringRepository.findByIdAndTenantId("dnata-offering", "SWISSPORT"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteOffering("dnata-offering"))
                .isInstanceOf(java.util.NoSuchElementException.class);
        verify(offeringRepository, never()).delete(any());
    }

    @Test
    void airlineMarketplaceAppliesEligibilityFiltersRegionAndAbac() {
        airlineAuthentication();
        ServiceOffering dxbBaggage = offering("offering-1", "SWISSPORT", "DXB", "BAGGAGE");
        ServiceOffering lhrBaggage = offering("offering-2", "DNATA", "LHR", "BAGGAGE");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(offeringRepository.findMarketplaceOfferings("EK"))
                .thenReturn(List.of(dxbBaggage, lhrBaggage));
        when(airportRepository.findById("DXB")).thenReturn(Optional.of(airport("DXB", "MIDDLE_EAST")));
        when(airportRepository.findById("LHR")).thenReturn(Optional.of(airport("LHR", "EUROPE")));
        when(chargeCodeRepository.findById("BAGGAGE")).thenReturn(Optional.of(chargeCode("BAGGAGE")));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);

        var result = service.browseMarketplace(null, "middle_east", "baggage");

        assertThat(result).singleElement()
                .satisfies(response -> {
                    assertThat(response.getSupplierId()).isEqualTo("SWISSPORT");
                    assertThat(response.getRegion()).isEqualTo("MIDDLE_EAST");
                });
        verify(offeringRepository).findMarketplaceOfferings("EK");
    }

    private void supplierAuthentication() {
        setAuthentication(new TestingAuthenticationToken("supplier-user", "n/a", "RFP_MONITOR"));
    }

    private void airlineAuthentication() {
        setAuthentication(new TestingAuthenticationToken("airline-user", "n/a", "RFP_RAISER"));
    }

    private void setAuthentication(TestingAuthenticationToken authentication) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
    }

    private ServiceOfferingCreateRequest request(String airportCode, String serviceType) {
        ServiceOfferingCreateRequest request = new ServiceOfferingCreateRequest();
        request.setAirportCode(airportCode);
        request.setServiceType(serviceType);
        request.setDescription("24/7 baggage handling with dedicated equipment");
        return request;
    }

    private ServiceOffering offering(String id, String supplierId, String airportCode, String serviceType) {
        return ServiceOffering.builder()
                .id(id)
                .tenantId(supplierId)
                .airportCode(airportCode)
                .serviceType(serviceType)
                .description("24/7 baggage handling")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    private void stubReferences(String airportCode, String serviceType) {
        when(airportRepository.findById(airportCode))
                .thenReturn(Optional.of(airport(airportCode, "MIDDLE_EAST")));
        when(chargeCodeRepository.findById(serviceType))
                .thenReturn(Optional.of(chargeCode(serviceType)));
    }

    private Airport airport(String code, String region) {
        return new Airport(code, code + " Airport", "City", "Country", region);
    }

    private ChargeCode chargeCode(String code) {
        return new ChargeCode(code, "Baggage Handling", "Baggage service");
    }
}
