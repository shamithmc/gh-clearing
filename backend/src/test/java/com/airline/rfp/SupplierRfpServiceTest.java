package com.airline.rfp;

import com.airline.api.dto.RfpProposalCreateRequest;
import com.airline.api.dto.SupplierRfpResponse;
import com.airline.domain.Rfp;
import com.airline.domain.RfpProposal;
import com.airline.domain.RfpProposalStatus;
import com.airline.domain.RfpStatus;
import com.airline.domain.SupplierRfpOutcome;
import com.airline.domain.SupplierRfpResponseStatus;
import com.airline.repository.RfpProposalRepository;
import com.airline.repository.RfpRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.SupplierRfpService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupplierRfpServiceTest {

    @Mock
    private RfpRepository rfpRepository;
    @Mock
    private RfpProposalRepository proposalRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private SupplierRfpService service;

    @BeforeEach
    void setUp() {
        service = new SupplierRfpService(
                rfpRepository, proposalRepository, tenantContext, dimensionalSecurityEvaluator);
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("rfp-monitor", "n/a", "RFP_MONITOR"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listUsesEligibilityPredicateAndFiltersEveryAbacDimension() {
        Rfp permitted = rfp("allowed", "DXB", "EK", "BAGGAGE");
        Rfp restricted = rfp("restricted", "LHR", "EK", "CATERING");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(rfpRepository.findAllForEligibleGroundHandler("SWISSPORT"))
                .thenReturn(List.of(permitted, restricted));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("LHR")).thenReturn(false);
        when(proposalRepository.findByRfpIdAndTenantId("allowed", "SWISSPORT"))
                .thenReturn(Optional.empty());

        List<SupplierRfpResponse> result = service.listOpportunities();

        assertThat(result).extracting(SupplierRfpResponse::getId).containsExactly("allowed");
        assertThat(result.getFirst().getResponseStatus())
                .isEqualTo(SupplierRfpResponseStatus.NOT_SUBMITTED);
        assertThat(result.getFirst().getOutcome()).isEqualTo(SupplierRfpOutcome.OPEN);
        verify(rfpRepository).findAllForEligibleGroundHandler("SWISSPORT");
        verify(proposalRepository, never()).findByRfpIdAndTenantId("restricted", "SWISSPORT");
    }

    @Test
    void awardedRfpsRemainVisibleWithSupplierOutcome() {
        Rfp won = rfp("won-rfp", "DXB", "EK", "BAGGAGE");
        won.setStatus(RfpStatus.AWARDED);
        Rfp notSelected = rfp("lost-rfp", "DXB", "EK", "CATERING");
        notSelected.setStatus(RfpStatus.AWARDED);
        RfpProposal accepted = proposal("won-proposal", "won-rfp", RfpProposalStatus.ACCEPTED);
        RfpProposal rejected = proposal("lost-proposal", "lost-rfp", RfpProposalStatus.REJECTED);
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(rfpRepository.findAllForEligibleGroundHandler("SWISSPORT"))
                .thenReturn(List.of(won, notSelected));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CATERING")).thenReturn(true);
        when(proposalRepository.findByRfpIdAndTenantId("won-rfp", "SWISSPORT"))
                .thenReturn(Optional.of(accepted));
        when(proposalRepository.findByRfpIdAndTenantId("lost-rfp", "SWISSPORT"))
                .thenReturn(Optional.of(rejected));

        List<SupplierRfpResponse> result = service.listOpportunities();

        assertThat(result).extracting(SupplierRfpResponse::getOutcome)
                .containsExactly(SupplierRfpOutcome.WON, SupplierRfpOutcome.NOT_SELECTED);
        assertThat(result).extracting(SupplierRfpResponse::getResponseStatus)
                .containsExactly(SupplierRfpResponseStatus.ACCEPTED, SupplierRfpResponseStatus.REJECTED);
    }

    @Test
    void eligibleSupplierSubmitsOneTenantOwnedProposal() {
        Rfp rfp = rfp("rfp-1", "DXB", "EK", "BAGGAGE");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(rfpRepository.findPublishedByIdForEligibleGroundHandler("rfp-1", "SWISSPORT"))
                .thenReturn(Optional.of(rfp));
        when(proposalRepository.save(any(RfpProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SupplierRfpResponse response = service.submitProposal("rfp-1", request());

        assertThat(response.getProposalStatus()).isEqualTo(RfpProposalStatus.SUBMITTED);
        assertThat(response.getProposedRate()).isEqualByComparingTo("18.7500");
        verify(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", java.util.Set.of("BAGGAGE"));
        ArgumentCaptor<RfpProposal> captor = ArgumentCaptor.forClass(RfpProposal.class);
        verify(proposalRepository).save(captor.capture());
        assertThat(captor.getValue().getTenantId()).isEqualTo("SWISSPORT");
        assertThat(captor.getValue().getCurrency()).isEqualTo("USD");
        assertThat(captor.getValue().getSubmittedBy()).isEqualTo("rfp-monitor");
    }

    @Test
    void nonEligibleSupplierCannotProbeOrSubmitProposal() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(rfpRepository.findPublishedByIdForEligibleGroundHandler("rfp-1", "SWISSPORT"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submitProposal("rfp-1", request()))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("not found");

        verify(proposalRepository, never()).save(any());
    }

    @Test
    void duplicateSupplierProposalIsRejected() {
        Rfp rfp = rfp("rfp-1", "DXB", "EK", "BAGGAGE");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(rfpRepository.findPublishedByIdForEligibleGroundHandler("rfp-1", "SWISSPORT"))
                .thenReturn(Optional.of(rfp));
        when(proposalRepository.existsByRfpIdAndTenantId("rfp-1", "SWISSPORT")).thenReturn(true);

        assertThatThrownBy(() -> service.submitProposal("rfp-1", request()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already");

        verify(proposalRepository, never()).save(any());
    }

    @Test
    void missingRfpMonitorRoleFailsBeforeEligibilityRead() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("invoice-user", "n/a", "INVOICE_ENTRY"));

        assertThatThrownBy(service::listOpportunities)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("RFP_MONITOR");

        verify(rfpRepository, never()).findAllForEligibleGroundHandler(any());
    }

    private RfpProposalCreateRequest request() {
        RfpProposalCreateRequest request = new RfpProposalCreateRequest();
        request.setProposedRate(new BigDecimal("18.7500"));
        request.setCurrency(" usd ");
        request.setTerms("  Net 30. Rates fixed for twelve months.  ");
        return request;
    }

    private Rfp rfp(String id, String airport, String airline, String serviceType) {
        return Rfp.builder()
                .id(id)
                .tenantId(airline)
                .airlineId(airline)
                .airportCode(airport)
                .serviceType(serviceType)
                .requirements("Coverage required")
                .desiredStartDate(LocalDate.of(2027, 1, 1))
                .desiredEndDate(LocalDate.of(2028, 12, 31))
                .status(RfpStatus.PUBLISHED)
                .createdBy("airline-user")
                .createdAt(OffsetDateTime.now())
                .build();
    }

    private RfpProposal proposal(String id, String rfpId, RfpProposalStatus status) {
        return RfpProposal.builder()
                .id(id)
                .rfpId(rfpId)
                .tenantId("SWISSPORT")
                .proposedRate(new BigDecimal("18.7500"))
                .currency("USD")
                .terms("Net 30")
                .status(status)
                .submittedBy("rfp-monitor")
                .submittedAt(OffsetDateTime.now())
                .build();
    }
}
