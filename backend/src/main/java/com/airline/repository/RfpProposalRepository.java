package com.airline.repository;

import com.airline.domain.RfpProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RfpProposalRepository extends JpaRepository<RfpProposal, String> {
    Optional<RfpProposal> findByRfpIdAndTenantId(String rfpId, String tenantId);
    boolean existsByRfpIdAndTenantId(String rfpId, String tenantId);
}
