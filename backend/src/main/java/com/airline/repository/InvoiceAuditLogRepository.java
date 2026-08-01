package com.airline.repository;

import com.airline.domain.InvoiceAuditLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface InvoiceAuditLogRepository extends TenantScopedRepository<InvoiceAuditLog, String> {

    @Query("""
            select log from InvoiceAuditLog log
            where log.invoiceId = :invoiceId
              and exists (
                  select invoice.id from Invoice invoice
                  where invoice.id = log.invoiceId
                    and (invoice.supplierId = :tenantId or invoice.airlineId = :tenantId)
              )
            """)
    List<InvoiceAuditLog> findByInvoiceIdForTenant(
            @Param("invoiceId") String invoiceId,
            @Param("tenantId") String tenantId);
}
