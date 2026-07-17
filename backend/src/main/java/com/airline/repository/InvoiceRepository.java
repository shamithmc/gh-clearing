package com.airline.repository;

import com.airline.domain.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    @Query("SELECT i FROM Invoice i WHERE i.supplierId = :tenantId OR i.airlineId = :tenantId ORDER BY i.createdAt DESC")
    List<Invoice> findAllByTenantId(@Param("tenantId") String tenantId);

    boolean existsByInvoiceNumberAndAirlineIdAndSupplierId(String invoiceNumber, String airlineId, String supplierId);
}
