package com.airline.service;

import com.airline.api.dto.ContractReviewRequestResponse;
import com.airline.domain.Contract;
import com.airline.domain.ContractAuditLog;
import com.airline.domain.ContractReviewRequest;
import com.airline.domain.ContractStatus;
import com.airline.repository.ContractAuditLogRepository;
import com.airline.repository.ContractRepository;
import com.airline.repository.ContractReviewRequestRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContractReviewRequestService {

    private final ContractReviewRequestRepository reviewRequestRepository;
    private final ContractRepository contractRepository;
    private final ContractAuditLogRepository contractAuditLogRepository;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    public ContractReviewRequestService(
            ContractReviewRequestRepository reviewRequestRepository,
            ContractRepository contractRepository,
            ContractAuditLogRepository contractAuditLogRepository,
            TenantContext tenantContext,
            DimensionalSecurityEvaluator dimensionalSecurityEvaluator) {
        this.reviewRequestRepository = reviewRequestRepository;
        this.contractRepository = contractRepository;
        this.contractAuditLogRepository = contractAuditLogRepository;
        this.tenantContext = tenantContext;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
    }

    @Transactional
    public ContractReviewRequestResponse create(String contractId, String comment) {
        String tenantId = tenantContext.getCurrentTenantId();
        if (!"AIRLINE".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only airlines can request a contract review");
        }
        requireAnyRole(Set.of("CONTRACT_REVIEWER"));

        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> new NoSuchElementException("Contract not found"));
        if (!tenantId.equals(contract.getAirlineId())) {
            throw new AccessDeniedException("Contract does not belong to this airline");
        }
        verifyDimensionalAccess(contract);
        if (contract.getStatus() != ContractStatus.APPROVED) {
            throw new IllegalStateException("Only approved contracts can receive airline review requests");
        }

        String normalizedComment = comment == null ? "" : comment.trim();
        if (normalizedComment.isEmpty()) {
            throw new IllegalArgumentException("Comment is required");
        }

        OffsetDateTime now = OffsetDateTime.now();
        ContractReviewRequest reviewRequest = ContractReviewRequest.builder()
                .id(UUID.randomUUID().toString())
                .contractId(contract.getId())
                .groundHandlerId(contract.getGroundHandlerId())
                .airlineId(contract.getAirlineId())
                .comment(normalizedComment)
                .requestedBy(currentUserId())
                .createdAt(now)
                .build();
        reviewRequestRepository.save(reviewRequest);
        contractAuditLogRepository.save(ContractAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .contractId(contract.getId())
                .action("AIRLINE_REVIEW_REQUESTED")
                .userId(reviewRequest.getRequestedBy())
                .timestamp(now)
                .build());

        return mapToResponse(reviewRequest, contract);
    }

    @Transactional(readOnly = true)
    public List<ContractReviewRequestResponse> getGroundHandlerQueue() {
        String tenantId = tenantContext.getCurrentTenantId();
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("Only ground handlers can view the review request queue");
        }
        requireAnyRole(Set.of("CONTRACT_ENTRY", "CONTRACT_APPROVER"));

        return reviewRequestRepository.findByGroundHandlerIdOrderByCreatedAtDesc(tenantId).stream()
                .map(request -> contractRepository.findByIdAndTenantId(request.getContractId(), tenantId)
                        .map(contract -> new ReviewRequestContract(request, contract)))
                .flatMap(java.util.Optional::stream)
                .filter(item -> isDimensionallyPermitted(item.contract()))
                .map(item -> mapToResponse(item.request(), item.contract()))
                .toList();
    }

    private void verifyDimensionalAccess(Contract contract) {
        dimensionalSecurityEvaluator.verifyAccess(
                contract.getAirportCode(), contract.getAirlineId(), chargeCodes(contract));
    }

    private boolean isDimensionallyPermitted(Contract contract) {
        return dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())
                && dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())
                && contract.getServices().stream()
                        .allMatch(service -> dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode()));
    }

    private Set<String> chargeCodes(Contract contract) {
        return contract.getServices().stream()
                .map(service -> service.getChargeCode())
                .collect(Collectors.toSet());
    }

    private void requireAnyRole(Set<String> roles) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> roles.contains(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("One of the required roles is missing: " + roles);
        }
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    private ContractReviewRequestResponse mapToResponse(ContractReviewRequest request, Contract contract) {
        return ContractReviewRequestResponse.builder()
                .id(request.getId())
                .contractId(request.getContractId())
                .groundHandlerId(request.getGroundHandlerId())
                .airlineId(request.getAirlineId())
                .airportCode(contract.getAirportCode())
                .contractStatus(contract.getStatus())
                .comment(request.getComment())
                .requestedBy(request.getRequestedBy())
                .createdAt(request.getCreatedAt())
                .build();
    }

    private record ReviewRequestContract(ContractReviewRequest request, Contract contract) {
    }
}
