package com.airline.repository;

import com.airline.domain.ContractReviewRequest;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractReviewRequestRepository extends TenantScopedRepository<ContractReviewRequest, String> {
    List<ContractReviewRequest> findByGroundHandlerIdOrderByCreatedAtDesc(String groundHandlerId);
    List<ContractReviewRequest> findByAirlineIdOrderByCreatedAtDesc(String airlineId);
}
