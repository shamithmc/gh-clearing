package com.airline.rfp;

import com.airline.api.dto.RfpProposalDecisionRequest;
import com.airline.api.dto.RfpProposalDecisionResponse;
import com.airline.domain.Contract;
import com.airline.domain.Rfp;
import com.airline.domain.RfpProposal;
import com.airline.domain.RfpProposalStatus;
import com.airline.domain.RfpStatus;
import com.airline.repository.ContractAuditLogRepository;
import com.airline.repository.ContractRepository;
import com.airline.repository.RfpProposalRepository;
import com.airline.repository.RfpRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.RfpEvaluationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
class RfpEvaluationServiceTest {

    @Mock
    private RfpRepository rfpRepository;
    @Mock
    private RfpProposalRepository proposalRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractAuditLogRepository contractAuditLogRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    private RfpEvaluationService service;

    @BeforeEach
    void setUp() {
        service = new RfpEvaluationService(rfpRepository, proposalRepository, contractRepository,
                contractAuditLogRepository, tenantContext, dimensionalSecurityEvaluator);
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("airline-evaluator", "n/a", "RFP_RAISER"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listsOnlyProposalsForTenantOwnedDimensionAuthorizedRfp() {
        Rfp rfp = rfp();
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(rfpRepository.findByIdAndTenantId("rfp-1", "EK")).thenReturn(Optional.of(rfp));
        when(proposalRepository.findAllByRfpIdForOwnerOrderByProposedRateAsc("rfp-1", "EK"))
                .thenReturn(List.of(proposal("p-low", "DNATA", "15.00"),
                        proposal("p-high", "SWISSPORT", "18.75")));

        var result = service.listProposals("rfp-1");

        assertThat(result).extracting(response -> response.getGroundHandlerId())
                .containsExactly("DNATA", "SWISSPORT");
        verify(dimensionalSecurityEvaluator).verifyAccess(
                "DXB", "EK", java.util.Set.of("BAGGAGE"));
    }

    @Test
    void acceptingProposalRejectsCompetitorsAwardsRfpAndSeedsDraftContract() {
        Rfp rfp = rfp();
        RfpProposal accepted = proposal("proposal-1", "SWISSPORT", "18.75");
        RfpProposal competitor = proposal("proposal-2", "DNATA", "15.00");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(rfpRepository.findByIdAndTenantId("rfp-1", "EK")).thenReturn(Optional.of(rfp));
        when(proposalRepository.findByIdAndRfpIdForOwner("proposal-1", "rfp-1", "EK"))
                .thenReturn(Optional.of(accepted));
        when(proposalRepository.findAllByRfpIdForOwnerOrderByProposedRateAsc("rfp-1", "EK"))
                .thenReturn(List.of(competitor, accepted));
        when(contractRepository.save(any(Contract.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RfpProposalDecisionResponse response = service.decide(
                "rfp-1", "proposal-1", decision(RfpProposalStatus.ACCEPTED, true));

        assertThat(response.getProposalStatus()).isEqualTo(RfpProposalStatus.ACCEPTED);
        assertThat(response.getRfpStatus()).isEqualTo(RfpStatus.AWARDED);
        assertThat(response.getSeededContractId()).isNotBlank();
        assertThat(competitor.getStatus()).isEqualTo(RfpProposalStatus.REJECTED);
        assertThat(rfp.getAwardedProposalId()).isEqualTo("proposal-1");

        ArgumentCaptor<Contract> contractCaptor = ArgumentCaptor.forClass(Contract.class);
        verify(contractRepository).save(contractCaptor.capture());
        Contract contract = contractCaptor.getValue();
        assertThat(contract.getGroundHandlerId()).isEqualTo("SWISSPORT");
        assertThat(contract.getAirlineId()).isEqualTo("EK");
        assertThat(contract.getSourceRfpId()).isEqualTo("rfp-1");
        assertThat(contract.getStatus()).isEqualTo(com.airline.domain.ContractStatus.DRAFT);
        assertThat(contract.getServices()).singleElement()
                .satisfies(configuration -> {
                    assertThat(configuration.getChargeCode()).isEqualTo("BAGGAGE");
                    assertThat(configuration.getRateDetails().get("rate"))
                            .isEqualTo(new BigDecimal("18.75"));
                });
        verify(contractAuditLogRepository).save(any());
    }

    @Test
    void rejectingProposalLeavesRfpPublishedAndDoesNotCreateContract() {
        Rfp rfp = rfp();
        RfpProposal proposal = proposal("proposal-1", "SWISSPORT", "18.75");
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(rfpRepository.findByIdAndTenantId("rfp-1", "EK")).thenReturn(Optional.of(rfp));
        when(proposalRepository.findByIdAndRfpIdForOwner("proposal-1", "rfp-1", "EK"))
                .thenReturn(Optional.of(proposal));

        RfpProposalDecisionResponse response = service.decide(
                "rfp-1", "proposal-1", decision(RfpProposalStatus.REJECTED, true));

        assertThat(response.getProposalStatus()).isEqualTo(RfpProposalStatus.REJECTED);
        assertThat(response.getRfpStatus()).isEqualTo(RfpStatus.PUBLISHED);
        assertThat(response.getSeededContractId()).isNull();
        verify(contractRepository, never()).save(any());
        verify(rfpRepository, never()).save(any());
    }

    @Test
    void proposalFromAnotherRfpCannotBeEvaluated() {
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(rfpRepository.findByIdAndTenantId("rfp-1", "EK")).thenReturn(Optional.of(rfp()));
        when(proposalRepository.findByIdAndRfpIdForOwner("foreign-proposal", "rfp-1", "EK"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.decide(
                "rfp-1", "foreign-proposal", decision(RfpProposalStatus.ACCEPTED, true)))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Proposal not found");

        verify(contractRepository, never()).save(any());
    }

    private RfpProposalDecisionRequest decision(RfpProposalStatus status, boolean seedContract) {
        RfpProposalDecisionRequest request = new RfpProposalDecisionRequest();
        request.setStatus(status);
        request.setSeedContract(seedContract);
        return request;
    }

    private Rfp rfp() {
        return Rfp.builder()
                .id("rfp-1")
                .tenantId("EK")
                .airlineId("EK")
                .airportCode("DXB")
                .serviceType("BAGGAGE")
                .requirements("Coverage required")
                .desiredStartDate(LocalDate.of(2027, 1, 1))
                .desiredEndDate(LocalDate.of(2028, 12, 31))
                .status(RfpStatus.PUBLISHED)
                .createdBy("airline-user")
                .createdAt(OffsetDateTime.now())
                .build();
    }

    private RfpProposal proposal(String id, String supplierId, String rate) {
        return RfpProposal.builder()
                .id(id)
                .rfpId("rfp-1")
                .tenantId(supplierId)
                .proposedRate(new BigDecimal(rate))
                .currency("USD")
                .terms("Net 30")
                .status(RfpProposalStatus.SUBMITTED)
                .submittedBy("supplier-user")
                .submittedAt(OffsetDateTime.now())
                .build();
    }
}
