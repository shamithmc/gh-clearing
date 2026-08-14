package com.airline.repository;

import com.airline.domain.InvoiceLineItem;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceLineItemRepository extends TenantScopedRepository<InvoiceLineItem, String> {
    @Query("""
            select line from InvoiceLineItem line join line.invoice invoice
            where invoice.supplierId = :supplierId
              and line.operationalFlightId in :flightIds
            """)
    List<InvoiceLineItem> findInvoicedFlightServices(
            @Param("supplierId") String supplierId,
            @Param("flightIds") List<String> flightIds);
}
