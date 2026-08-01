package com.airline.repository;

import com.airline.domain.Dispute;
import com.airline.domain.DisputeStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface DisputeRepository extends TenantScopedRepository<Dispute, String> {

    List<Dispute> findAllByAirlineIdOrderByCreatedAtDesc(String airlineId);

    List<Dispute> findAllBySupplierIdOrderByCreatedAtDesc(String supplierId);

    Optional<Dispute> findByIdAndAirlineId(String id, String airlineId);

    Optional<Dispute> findByIdAndSupplierId(String id, String supplierId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Dispute d WHERE d.id = :id AND d.supplierId = :supplierId")
    Optional<Dispute> findByIdAndSupplierIdForUpdate(
            @Param("id") String id,
            @Param("supplierId") String supplierId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Dispute d WHERE d.id = :id AND d.airlineId = :airlineId")
    Optional<Dispute> findByIdAndAirlineIdForUpdate(
            @Param("id") String id,
            @Param("airlineId") String airlineId);

    List<Dispute> findAllBySupplierIdAndStatusOrderByCreatedAtDesc(String supplierId, DisputeStatus status);

    List<Dispute> findAllByAirlineIdAndStatusOrderByCreatedAtDesc(String airlineId, DisputeStatus status);

    @Query("SELECT d FROM Dispute d WHERE " +
           "(:tenantType = 'AIRLINE' AND d.airlineId = :tenantId) OR " +
           "(:tenantType = 'GROUND_HANDLER' AND d.supplierId = :tenantId) " +
           "ORDER BY d.createdAt DESC")
    List<Dispute> findAllForTenant(@Param("tenantId") String tenantId, @Param("tenantType") String tenantType);
}
