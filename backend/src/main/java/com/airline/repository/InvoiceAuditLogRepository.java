package com.airline.repository;

import com.airline.domain.InvoiceAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvoiceAuditLogRepository extends JpaRepository<InvoiceAuditLog, String> {
    List<InvoiceAuditLog> findByInvoiceId(String invoiceId);
}
