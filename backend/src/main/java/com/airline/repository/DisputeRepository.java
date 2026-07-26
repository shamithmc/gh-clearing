package com.airline.repository;

import com.airline.domain.Dispute;
import com.airline.domain.DisputeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, String> {

    List<Dispute> findAllByAirlineIdOrderByCreatedAtDesc(String airlineId);

    List<Dispute> findAllBySupplierIdOrderByCreatedAtDesc(String supplierId);

    Optional<Dispute> findByIdAndAirlineId(String id, String airlineId);

    Optional<Dispute> findByIdAndSupplierId(String id, String supplierId);

    Optional<Dispute> findByInvoiceId(String invoiceId);

    List<Dispute> findAllBySupplierIdAndStatusOrderByCreatedAtDesc(String supplierId, DisputeStatus status);

    List<Dispute> findAllByAirlineIdAndStatusOrderByCreatedAtDesc(String airlineId, DisputeStatus status);

    @Query("SELECT d FROM Dispute d WHERE " +
           "(:tenantType = 'AIRLINE' AND d.airlineId = :tenantId) OR " +
           "(:tenantType = 'GROUND_HANDLER' AND d.supplierId = :tenantId) " +
           "ORDER BY d.createdAt DESC")
    List<Dispute> findAllForTenant(@Param("tenantId") String tenantId, @Param("tenantType") String tenantType);
}
