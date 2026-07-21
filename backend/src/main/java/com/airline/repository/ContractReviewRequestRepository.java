package com.airline.repository;

import com.airline.domain.ContractReviewRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractReviewRequestRepository extends JpaRepository<ContractReviewRequest, String> {
    List<ContractReviewRequest> findByGroundHandlerIdOrderByCreatedAtDesc(String groundHandlerId);
}
