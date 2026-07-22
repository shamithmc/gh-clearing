package com.airline.service;

import com.airline.api.dto.AirlineRfpProposalResponse;
import com.airline.api.dto.RfpProposalDecisionRequest;
import com.airline.api.dto.RfpProposalDecisionResponse;
import com.airline.domain.Contract;
import com.airline.domain.ContractAuditLog;
import com.airline.domain.ContractStatus;
import com.airline.domain.FormulaType;
import com.airline.domain.Rfp;
import com.airline.domain.RfpProposal;
import com.airline.domain.RfpProposalStatus;
import com.airline.domain.RfpStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractAuditLogRepository;
import com.airline.repository.ContractRepository;
import com.airline.repository.RfpProposalRepository;
import com.airline.repository.RfpRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
public class RfpEvaluationService {

    private final RfpRepository rfpRepository;
    private final RfpProposalRepository proposalRepository;
    private final ContractRepository contractRepository;
    private final ContractAuditLogRepository contractAuditLogRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public RfpEvaluationService(
            RfpRepository rfpRepository,
            RfpProposalRepository proposalRepository,
            ContractRepository contractRepository,
            ContractAuditLogRepository contractAuditLogRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.rfpRepository = rfpRepository;
        this.proposalRepository = proposalRepository;
        this.contractRepository = contractRepository;
        this.contractAuditLogRepository = contractAuditLogRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public List<AirlineRfpProposalResponse> listProposals(String rfpId) {
        Rfp rfp = loadOwnedRfp(rfpId);
        verifyDimensionalAccess(rfp);
        return proposalRepository.findAllByRfpIdOrderByProposedRateAsc(rfpId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RfpProposalDecisionResponse decide(
            String rfpId, String proposalId, RfpProposalDecisionRequest request) {
        Rfp rfp = loadOwnedRfp(rfpId);
        verifyDimensionalAccess(rfp);
        if (rfp.getStatus() != RfpStatus.PUBLISHED) {
            throw new IllegalStateException("Only published RFPs can be evaluated");
        }
        if (request.getStatus() != RfpProposalStatus.ACCEPTED
                && request.getStatus() != RfpProposalStatus.REJECTED) {
            throw new IllegalArgumentException("Proposal decision must be ACCEPTED or REJECTED");
        }

        RfpProposal proposal = proposalRepository.findByIdAndRfpId(proposalId, rfpId)
                .orElseThrow(() -> new NoSuchElementException("Proposal not found"));
        if (proposal.getStatus() != RfpProposalStatus.SUBMITTED) {
            throw new IllegalStateException("Only submitted proposals can be evaluated");
        }

        OffsetDateTime decidedAt = OffsetDateTime.now();
        String decidedBy = currentUserId();
        proposal.setStatus(request.getStatus());
        proposal.setDecidedBy(decidedBy);
        proposal.setDecidedAt(decidedAt);
        proposalRepository.save(proposal);

        String seededContractId = null;
        if (request.getStatus() == RfpProposalStatus.ACCEPTED) {
            rejectOtherProposals(rfpId, proposalId, decidedBy, decidedAt);
            rfp.setStatus(RfpStatus.AWARDED);
            rfp.setAwardedProposalId(proposalId);
            rfpRepository.save(rfp);
            if (request.isSeedContract()) {
                seededContractId = seedDraftContract(rfp, proposal, decidedBy);
            }
        }

        return RfpProposalDecisionResponse.builder()
                .proposalId(proposal.getId())
                .proposalStatus(proposal.getStatus())
                .rfpStatus(rfp.getStatus())
                .seededContractId(seededContractId)
                .build();
    }

    private Rfp loadOwnedRfp(String rfpId) {
        String airlineId = requireAirlineRfpRaiser();
        return rfpRepository.findByIdAndTenantId(rfpId, airlineId)
                .orElseThrow(() -> new NoSuchElementException("RFP not found"));
    }

    private String requireAirlineRfpRaiser() {
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only airlines can evaluate RFP proposals");
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

    private void verifyDimensionalAccess(Rfp rfp) {
        dimensionalSecurityEvaluator.verifyAccess(
                rfp.getAirportCode(), rfp.getAirlineId(), Set.of(rfp.getServiceType()));
    }

    private void rejectOtherProposals(
            String rfpId, String acceptedProposalId, String decidedBy, OffsetDateTime decidedAt) {
        List<RfpProposal> rejected = proposalRepository.findAllByRfpIdOrderByProposedRateAsc(rfpId).stream()
                .filter(candidate -> !candidate.getId().equals(acceptedProposalId))
                .filter(candidate -> candidate.getStatus() == RfpProposalStatus.SUBMITTED)
                .peek(candidate -> {
                    candidate.setStatus(RfpProposalStatus.REJECTED);
                    candidate.setDecidedBy(decidedBy);
                    candidate.setDecidedAt(decidedAt);
                })
                .toList();
        proposalRepository.saveAll(rejected);
    }

    private String seedDraftContract(Rfp rfp, RfpProposal proposal, String userId) {
        Contract contract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .groundHandlerId(proposal.getTenantId())
                .airlineId(rfp.getAirlineId())
                .airportCode(rfp.getAirportCode())
                .startDate(rfp.getDesiredStartDate())
                .endDate(rfp.getDesiredEndDate())
                .status(ContractStatus.DRAFT)
                .currency(proposal.getCurrency())
                .createdAt(OffsetDateTime.now())
                .sourceRfpId(rfp.getId())
                .build();
        contract.addService(ServiceConfiguration.builder()
                .id(UUID.randomUUID().toString())
                .chargeCode(rfp.getServiceType())
                .serviceName(rfp.getServiceType())
                .formulaType(FormulaType.PF_01)
                .rateDetails(Map.of("rate", proposal.getProposedRate(), "source", "RFP"))
                .quantityDriver("UNIT")
                .uom("EA")
                .createdAt(OffsetDateTime.now())
                .build());
        Contract saved = contractRepository.save(contract);
        contractAuditLogRepository.save(ContractAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .contractId(saved.getId())
                .action("RFP_PROPOSAL_ACCEPTED")
                .userId(userId)
                .timestamp(OffsetDateTime.now())
                .build());
        return saved.getId();
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    private AirlineRfpProposalResponse toResponse(RfpProposal proposal) {
        return AirlineRfpProposalResponse.builder()
                .id(proposal.getId())
                .rfpId(proposal.getRfpId())
                .groundHandlerId(proposal.getTenantId())
                .proposedRate(proposal.getProposedRate())
                .currency(proposal.getCurrency())
                .terms(proposal.getTerms())
                .status(proposal.getStatus())
                .submittedAt(proposal.getSubmittedAt())
                .build();
    }
}
