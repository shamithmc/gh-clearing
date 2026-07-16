package com.airline.service;

import com.airline.domain.Invoice;
import com.airline.domain.InvoiceStatus;
import com.airline.repository.InvoiceRepository;
import com.airline.security.TenantContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final TenantContext tenantContext;

    public InvoiceService(InvoiceRepository invoiceRepository, TenantContext tenantContext) {
        this.invoiceRepository = invoiceRepository;
        this.tenantContext = tenantContext;
    }

    @Transactional
    public Invoice createInvoice(Invoice invoice) {
        String tenantType = tenantContext.getCurrentTenantType();
        String tenantId = tenantContext.getCurrentTenantId();

        if (!"GROUND_HANDLER".equals(tenantType)) {
            throw new AccessDeniedException("Only ground handlers can create invoices");
        }

        if (!invoice.getSupplierId().equals(tenantId)) {
            throw new AccessDeniedException("Cannot create invoice for a different supplier");
        }

        if (invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId(
                invoice.getInvoiceNumber(), invoice.getAirlineId(), invoice.getSupplierId())) {
            throw new IllegalArgumentException("Invoice number must be unique per airline-supplier pair");
        }

        invoice.setId(UUID.randomUUID().toString());
        invoice.setStatus(InvoiceStatus.DRAFT);

        if (invoice.getLineItems() != null) {
            invoice.getLineItems().forEach(item -> {
                item.setId(UUID.randomUUID().toString());
                item.setInvoice(invoice);
            });
        }

        return invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoice(String id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("Invoice not found: " + id));

        String tenantId = tenantContext.getCurrentTenantId();
        if (!invoice.getSupplierId().equals(tenantId) && !invoice.getAirlineId().equals(tenantId)) {
            throw new AccessDeniedException("Access denied to this invoice");
        }

        return invoice;
    }

    @Transactional(readOnly = true)
    public List<Invoice> listInvoices() {
        String tenantId = tenantContext.getCurrentTenantId();
        return invoiceRepository.findAllByTenantId(tenantId);
    }

    @Transactional
    public Invoice updateInvoice(String id, Invoice updatedInvoice) {
        Invoice existing = getInvoice(id);

        // INV-08: Dispatched Invoice Immutability
        if (existing.getStatus() == InvoiceStatus.SENT || 
            existing.getStatus() == InvoiceStatus.PAID || 
            existing.getStatus() == InvoiceStatus.DISPUTED) {
            throw new IllegalStateException("Dispatched invoices are immutable and cannot be updated");
        }

        existing.setInvoiceNumber(updatedInvoice.getInvoiceNumber());
        existing.setAirlineId(updatedInvoice.getAirlineId());
        existing.setAirportCode(updatedInvoice.getAirportCode());
        existing.setCurrency(updatedInvoice.getCurrency());
        existing.setExchangeRate(updatedInvoice.getExchangeRate());
        existing.setIssueDate(updatedInvoice.getIssueDate());
        existing.setDueDate(updatedInvoice.getDueDate());
        existing.setTotalAmount(updatedInvoice.getTotalAmount());

        existing.getLineItems().clear();
        if (updatedInvoice.getLineItems() != null) {
            updatedInvoice.getLineItems().forEach(item -> {
                item.setId(UUID.randomUUID().toString());
                existing.addLineItem(item);
            });
        }

        return invoiceRepository.save(existing);
    }

    @Transactional
    public Invoice updateInvoiceStatus(String id, InvoiceStatus targetStatus) {
        Invoice existing = getInvoice(id);

        // Validate state transition logic if needed
        existing.setStatus(targetStatus);
        return invoiceRepository.save(existing);
    }

    @Transactional
    public void deleteInvoice(String id) {
        Invoice existing = getInvoice(id);

        // INV-08: Dispatched Invoice Immutability
        if (existing.getStatus() == InvoiceStatus.SENT || 
            existing.getStatus() == InvoiceStatus.PAID || 
            existing.getStatus() == InvoiceStatus.DISPUTED) {
            throw new IllegalStateException("Dispatched invoices are immutable and cannot be deleted");
        }

        invoiceRepository.delete(existing);
    }
}
