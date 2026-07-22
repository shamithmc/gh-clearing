package com.airline.repository;

import com.airline.domain.Rfp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RfpRepository extends JpaRepository<Rfp, String> {
    List<Rfp> findAllByTenantIdOrderByCreatedAtDesc(String tenantId);
    Optional<Rfp> findByIdAndTenantId(String id, String tenantId);

    @Query("""
            select distinct rfp from Rfp rfp
            join rfp.eligibleGroundHandlerIds handlerId
            where handlerId = :groundHandlerId and rfp.status = com.airline.domain.RfpStatus.PUBLISHED
            order by rfp.createdAt desc
            """)
    List<Rfp> findPublishedForEligibleGroundHandler(
            @Param("groundHandlerId") String groundHandlerId);

    @Query("""
            select distinct rfp from Rfp rfp
            join rfp.eligibleGroundHandlerIds handlerId
            where rfp.id = :rfpId and handlerId = :groundHandlerId
              and rfp.status = com.airline.domain.RfpStatus.PUBLISHED
            """)
    Optional<Rfp> findPublishedByIdForEligibleGroundHandler(
            @Param("rfpId") String rfpId,
            @Param("groundHandlerId") String groundHandlerId);
}
