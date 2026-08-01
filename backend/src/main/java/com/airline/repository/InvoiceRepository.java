package com.airline.repository;

import com.airline.domain.Invoice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

@Repository
public interface InvoiceRepository extends TenantScopedRepository<Invoice, String> {

    @Query("SELECT i FROM Invoice i WHERE i.supplierId = :tenantId OR i.airlineId = :tenantId ORDER BY i.createdAt DESC")
    List<Invoice> findAllByTenantId(@Param("tenantId") String tenantId);

    @Query("SELECT i FROM Invoice i WHERE i.id = :id AND (i.supplierId = :tenantId OR i.airlineId = :tenantId)")
    Optional<Invoice> findByIdAndTenantId(@Param("id") String id, @Param("tenantId") String tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id AND i.supplierId = :supplierId")
    Optional<Invoice> findByIdAndSupplierIdForUpdate(
            @Param("id") String id,
            @Param("supplierId") String supplierId);

    boolean existsByInvoiceNumberAndAirlineIdAndSupplierId(String invoiceNumber, String airlineId, String supplierId);
}
