package com.airline.repository;

import com.airline.domain.RfpProposal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface RfpProposalRepository extends TenantScopedRepository<RfpProposal, String> {
    Optional<RfpProposal> findByIdAndTenantId(String id, String tenantId);
    Optional<RfpProposal> findByRfpIdAndTenantId(String rfpId, String tenantId);
    boolean existsByRfpIdAndTenantId(String rfpId, String tenantId);
    @Query("""
            select proposal from RfpProposal proposal
            where proposal.id = :proposalId and proposal.rfpId = :rfpId
              and exists (
                  select rfp.id from Rfp rfp
                  where rfp.id = proposal.rfpId and rfp.tenantId = :airlineId
              )
            """)
    Optional<RfpProposal> findByIdAndRfpIdForOwner(
            @Param("proposalId") String proposalId,
            @Param("rfpId") String rfpId,
            @Param("airlineId") String airlineId);

    @Query("""
            select proposal from RfpProposal proposal
            where proposal.rfpId = :rfpId
              and exists (
                  select rfp.id from Rfp rfp
                  where rfp.id = proposal.rfpId and rfp.tenantId = :airlineId
              )
            order by proposal.proposedRate asc
            """)
    List<RfpProposal> findAllByRfpIdForOwnerOrderByProposedRateAsc(
            @Param("rfpId") String rfpId,
            @Param("airlineId") String airlineId);
}
