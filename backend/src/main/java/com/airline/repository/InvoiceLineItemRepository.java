package com.airline.repository;

import com.airline.domain.InvoiceLineItem;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceLineItemRepository extends TenantScopedRepository<InvoiceLineItem, String> {
}
