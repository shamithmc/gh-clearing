package com.airline.repository;

import com.airline.domain.InvoiceDispatchJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InvoiceDispatchJobRepository extends TenantScopedRepository<InvoiceDispatchJob, String> {

    @Query("SELECT job FROM InvoiceDispatchJob job WHERE job.invoiceId = :invoiceId AND job.tenantId = :tenantId")
    Optional<InvoiceDispatchJob> findByInvoiceIdAndTenantId(
            @Param("invoiceId") String invoiceId,
            @Param("tenantId") String tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT job FROM InvoiceDispatchJob job WHERE job.invoiceId = :invoiceId AND job.tenantId = :tenantId")
    Optional<InvoiceDispatchJob> findByInvoiceIdAndTenantIdForUpdate(
            @Param("invoiceId") String invoiceId,
            @Param("tenantId") String tenantId);
}
