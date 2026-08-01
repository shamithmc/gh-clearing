package com.airline.repository;

import com.airline.domain.CreditNote;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CreditNoteRepository extends TenantScopedRepository<CreditNote, String> {
    @Query("SELECT c FROM CreditNote c WHERE c.supplierId = :tenantId OR c.airlineId = :tenantId ORDER BY c.createdAt DESC")
    List<CreditNote> findAllByTenantId(@Param("tenantId") String tenantId);

    @Query("SELECT c FROM CreditNote c WHERE c.id = :id AND (c.supplierId = :tenantId OR c.airlineId = :tenantId)")
    Optional<CreditNote> findByIdAndTenantId(@Param("id") String id, @Param("tenantId") String tenantId);

    Optional<CreditNote> findByDisputeIdAndSupplierId(String disputeId, String supplierId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CreditNote c WHERE c.invoiceId = :invoiceId AND c.supplierId = :supplierId")
    BigDecimal sumAmountByInvoiceIdAndSupplierId(
            @Param("invoiceId") String invoiceId,
            @Param("supplierId") String supplierId);
}
