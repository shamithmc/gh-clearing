package com.airline.service;

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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
public class SupplierRfpService {

    private final RfpRepository rfpRepository;
    private final RfpProposalRepository proposalRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public SupplierRfpService(
            RfpRepository rfpRepository,
            RfpProposalRepository proposalRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.rfpRepository = rfpRepository;
        this.proposalRepository = proposalRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional(readOnly = true)
    public List<SupplierRfpResponse> listOpportunities() {
        String groundHandlerId = requireSupplierRfpMonitor();
        return rfpRepository.findAllForEligibleGroundHandler(groundHandlerId).stream()
                .filter(this::isDimensionallyPermitted)
                .map(rfp -> toResponse(rfp,
                        proposalRepository.findByRfpIdAndTenantId(rfp.getId(), groundHandlerId).orElse(null)))
                .toList();
    }

    @Transactional
    public SupplierRfpResponse submitProposal(String rfpId, RfpProposalCreateRequest request) {
        String groundHandlerId = requireSupplierRfpMonitor();
        Rfp rfp = rfpRepository.findPublishedByIdForEligibleGroundHandler(rfpId, groundHandlerId)
                .orElseThrow(() -> new NoSuchElementException("RFP not found"));
        verifyDimensionalAccess(rfp);
        if (proposalRepository.existsByRfpIdAndTenantId(rfpId, groundHandlerId)) {
            throw new IllegalStateException("A proposal has already been submitted for this RFP");
        }

        RfpProposal proposal = RfpProposal.builder()
                .id(UUID.randomUUID().toString())
                .rfpId(rfp.getId())
                .tenantId(groundHandlerId)
                .proposedRate(request.getProposedRate())
                .currency(request.getCurrency().trim().toUpperCase(Locale.ROOT))
                .terms(request.getTerms().trim())
                .status(RfpProposalStatus.SUBMITTED)
                .submittedBy(currentUserId())
                .submittedAt(OffsetDateTime.now())
                .build();
        return toResponse(rfp, proposalRepository.save(proposal));
    }

    private String requireSupplierRfpMonitor() {
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only ground handlers can access supplier RFP opportunities");
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "RFP_MONITOR".equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: RFP_MONITOR");
        }
        return tenantContext.getCurrentTenantId();
    }

    private void verifyDimensionalAccess(Rfp rfp) {
        dimensionalSecurityEvaluator.verifyAccess(
                rfp.getAirportCode(), rfp.getAirlineId(), Set.of(rfp.getServiceType()));
    }

    private boolean isDimensionallyPermitted(Rfp rfp) {
        return dimensionalSecurityEvaluator.isAirportPermitted(rfp.getAirportCode())
                && dimensionalSecurityEvaluator.isAirlinePermitted(rfp.getAirlineId())
                && dimensionalSecurityEvaluator.isChargeCodePermitted(rfp.getServiceType());
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    private SupplierRfpResponse toResponse(Rfp rfp, RfpProposal proposal) {
        return SupplierRfpResponse.builder()
                .id(rfp.getId())
                .airlineId(rfp.getAirlineId())
                .airportCode(rfp.getAirportCode())
                .serviceType(rfp.getServiceType())
                .requirements(rfp.getRequirements())
                .desiredStartDate(rfp.getDesiredStartDate())
                .desiredEndDate(rfp.getDesiredEndDate())
                .status(rfp.getStatus())
                .createdAt(rfp.getCreatedAt())
                .proposalId(proposal == null ? null : proposal.getId())
                .proposalStatus(proposal == null ? null : proposal.getStatus())
                .proposedRate(proposal == null ? null : proposal.getProposedRate())
                .proposalCurrency(proposal == null ? null : proposal.getCurrency())
                .proposalTerms(proposal == null ? null : proposal.getTerms())
                .responseStatus(responseStatus(proposal))
                .outcome(outcome(rfp, proposal))
                .build();
    }

    private SupplierRfpResponseStatus responseStatus(RfpProposal proposal) {
        return proposal == null
                ? SupplierRfpResponseStatus.NOT_SUBMITTED
                : SupplierRfpResponseStatus.valueOf(proposal.getStatus().name());
    }

    private SupplierRfpOutcome outcome(Rfp rfp, RfpProposal proposal) {
        if (rfp.getStatus() == RfpStatus.CLOSED) {
            return SupplierRfpOutcome.CLOSED;
        }
        if (rfp.getStatus() == RfpStatus.AWARDED) {
            return proposal != null && proposal.getStatus() == RfpProposalStatus.ACCEPTED
                    ? SupplierRfpOutcome.WON
                    : SupplierRfpOutcome.NOT_SELECTED;
        }
        return proposal == null
                ? SupplierRfpOutcome.OPEN
                : SupplierRfpOutcome.PENDING_DECISION;
    }
}
