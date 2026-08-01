package com.airline.rfp;

import com.airline.api.dto.RfpCreateRequest;
import com.airline.api.dto.RfpResponse;
import com.airline.domain.Rfp;
import com.airline.domain.RfpStatus;
import com.airline.repository.RfpRepository;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.ReferenceDataService;
import com.airline.service.RfpService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RfpServiceTest {

    @Mock
    private RfpRepository rfpRepository;
    @Mock
    private SupplierConfigurationRepository supplierConfigurationRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock
    private ReferenceDataService referenceDataService;

    private RfpService rfpService;

    @BeforeEach
    void setUp() {
        rfpService = new RfpService(rfpRepository, supplierConfigurationRepository,
                tenantContext, dimensionalSecurityEvaluator, referenceDataService);
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("rfp-user", "n/a", "RFP_RAISER"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsPublishedRfpForOnlyConfiguredEligibleGroundHandlers() {
        RfpCreateRequest request = request();
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(supplierConfigurationRepository.findEligibleGroundHandlerIds("DXB", "EK"))
                .thenReturn(Set.of("SWISSPORT", "DNATA"));
        when(rfpRepository.save(any(Rfp.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RfpResponse response = rfpService.create(request);

        assertThat(response.getStatus()).isEqualTo(RfpStatus.PUBLISHED);
        assertThat(response.getAirlineId()).isEqualTo("EK");
        assertThat(response.getEligibleGroundHandlerIds()).containsExactlyInAnyOrder("SWISSPORT", "DNATA");
        verify(referenceDataService).getAirport("DXB");
        verify(referenceDataService).getChargeCode("BAGGAGE");
        verify(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", Set.of("BAGGAGE"));

        ArgumentCaptor<Rfp> captor = ArgumentCaptor.forClass(Rfp.class);
        verify(rfpRepository).save(captor.capture());
        assertThat(captor.getValue().getTenantId()).isEqualTo("EK");
        assertThat(captor.getValue().getCreatedBy()).isEqualTo("rfp-user");
        assertThat(captor.getValue().getRequirements()).isEqualTo("Provide 24/7 baggage handling.");
    }

    @Test
    void listUsesAirlineTenantPredicate() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(rfpRepository.findAllByTenantIdOrderByCreatedAtDesc("EK")).thenReturn(List.of());

        assertThat(rfpService.listOwn()).isEmpty();

        verify(rfpRepository).findAllByTenantIdOrderByCreatedAtDesc("EK");
    }

    @Test
    void userWithoutRfpRaiserRoleIsDeniedBeforeRepositoryAccess() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("viewer", "n/a", "MIS_VIEWER"));

        assertThatThrownBy(() -> rfpService.create(request()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("RFP_RAISER");

        verify(rfpRepository, never()).save(any());
        verify(supplierConfigurationRepository, never())
                .findEligibleGroundHandlerIds(any(), any());
    }

    @Test
    void invalidDesiredPeriodFailsBeforePublication() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        RfpCreateRequest request = request();
        request.setDesiredEndDate(request.getDesiredStartDate().minusDays(1));

        assertThatThrownBy(() -> rfpService.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("end date");

        verify(rfpRepository, never()).save(any());
    }

    @Test
    void restrictedDimensionFailsBeforeSupplierEligibilityIsRead() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        doThrow(new AccessDeniedException("Restricted"))
                .when(dimensionalSecurityEvaluator)
                .verifyAccess("DXB", "EK", Set.of("BAGGAGE"));

        assertThatThrownBy(() -> rfpService.create(request()))
                .isInstanceOf(AccessDeniedException.class);

        verify(supplierConfigurationRepository, never())
                .findEligibleGroundHandlerIds(any(), any());
        verify(rfpRepository, never()).save(any());
    }

    private RfpCreateRequest request() {
        RfpCreateRequest request = new RfpCreateRequest();
        request.setAirportCode(" dxb ");
        request.setServiceType(" baggage ");
        request.setRequirements("  Provide 24/7 baggage handling.  ");
        request.setDesiredStartDate(LocalDate.of(2027, 1, 1));
        request.setDesiredEndDate(LocalDate.of(2029, 12, 31));
        return request;
    }
}
