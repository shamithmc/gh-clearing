package com.airline.service;

import com.airline.domain.Contract;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.pricing.PricingEngine;
import com.airline.security.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ContractRepository contractRepository;
    private final PricingEngine pricingEngine;
    private final TenantContext tenantContext;
    private final ObjectMapper objectMapper;
    private final com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          ContractRepository contractRepository,
                          PricingEngine pricingEngine,
                          TenantContext tenantContext,
                          ObjectMapper objectMapper,
                          com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository) {
        this.invoiceRepository = invoiceRepository;
        this.contractRepository = contractRepository;
        this.pricingEngine = pricingEngine;
        this.tenantContext = tenantContext;
        this.objectMapper = objectMapper;
        this.invoiceAuditLogRepository = invoiceAuditLogRepository;
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

        calculateAndValidateInvoice(invoice);

        invoice.setId(UUID.randomUUID().toString());
        invoice.setStatus(InvoiceStatus.DRAFT);

        if (invoice.getLineItems() != null) {
            invoice.getLineItems().forEach(item -> {
                item.setId(UUID.randomUUID().toString());
                item.setInvoice(invoice);
            });
        }

        Invoice saved = invoiceRepository.save(invoice);
        audit(saved.getId(), "CREATED");
        return saved;
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

        existing.getLineItems().clear();
        if (updatedInvoice.getLineItems() != null) {
            updatedInvoice.getLineItems().forEach(item -> {
                item.setId(UUID.randomUUID().toString());
                existing.addLineItem(item);
            });
        }

        calculateAndValidateInvoice(existing);

        Invoice saved = invoiceRepository.save(existing);
        audit(saved.getId(), "UPDATED");
        return saved;
    }

    @Transactional
    public Invoice updateInvoiceStatus(String id, InvoiceStatus targetStatus) {
        Invoice existing = getInvoice(id);
        existing.setStatus(targetStatus);
        Invoice saved = invoiceRepository.save(existing);
        audit(saved.getId(), "STATUS_CHANGED");
        return saved;
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

    private void calculateAndValidateInvoice(Invoice invoice) {
        // Enforce uniqueness validation INV-07
        if (invoice.getId() == null) {
            if (invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId(
                    invoice.getInvoiceNumber(), invoice.getAirlineId(), invoice.getSupplierId())) {
                throw new IllegalArgumentException("Invoice number must be unique per airline-supplier pair");
            }
        } else {
            Invoice existing = invoiceRepository.findById(invoice.getId()).orElse(null);
            if (existing != null && !existing.getInvoiceNumber().equals(invoice.getInvoiceNumber())) {
                if (invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId(
                        invoice.getInvoiceNumber(), invoice.getAirlineId(), invoice.getSupplierId())) {
                    throw new IllegalArgumentException("Invoice number must be unique per airline-supplier pair");
                }
            }
        }

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (invoice.getLineItems() != null) {
            for (InvoiceLineItem item : invoice.getLineItems()) {
                if (item.getContractId() == null) {
                    throw new IllegalArgumentException("Line item must reference a contract");
                }
                Contract contract = contractRepository.findById(item.getContractId())
                        .orElseThrow(() -> new IllegalArgumentException("Contract not found: " + item.getContractId()));

                if (contract.getStatus() != com.airline.domain.ContractStatus.APPROVED) {
                    throw new IllegalArgumentException("Contract must be APPROVED to create invoice line items");
                }

                if (invoice.getIssueDate().isBefore(contract.getStartDate()) || invoice.getIssueDate().isAfter(contract.getEndDate())) {
                    throw new IllegalArgumentException("Invoice issue date is outside the contract validity period");
                }

                ServiceConfiguration serviceConfig = contract.getServices().stream()
                        .filter(s -> s.getChargeCode().equals(item.getChargeCode()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Service with charge code " + item.getChargeCode() + " not found in contract"));

                Map<String, Object> flightInputs = parseQuantityDrivers(item.getQuantityDrivers());

                // Enforce INV-05: PF-07 Tail ID Requirement
                if (serviceConfig.getFormulaType() == com.airline.domain.FormulaType.PF_07) {
                    Object tailNumber = flightInputs.get("tailNumber");
                    if (tailNumber == null || tailNumber.toString().trim().isEmpty()) {
                        throw new IllegalArgumentException("PF-07 requires 'tailNumber' input in quantity drivers");
                    }
                }

                item.setServiceName(serviceConfig.getServiceName());
                item.setFormulaType(serviceConfig.getFormulaType().getValue());

                BigDecimal baseCharge = pricingEngine.calculateCharge(serviceConfig, flightInputs);

                // Enforce INV-06: Cross-Currency Exchange Rate Mandate
                BigDecimal finalAmount;
                if (!contract.getCurrency().equals(invoice.getCurrency())) {
                    if (invoice.getExchangeRate() == null || invoice.getExchangeRate().compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Exchange rate must be provided and positive when invoice and contract currencies differ");
                    }
                    finalAmount = baseCharge.multiply(invoice.getExchangeRate());
                } else {
                    finalAmount = baseCharge;
                }

                item.setCalculatedAmount(finalAmount.setScale(2, java.math.RoundingMode.HALF_UP));
                totalAmount = totalAmount.add(item.getCalculatedAmount());
            }
        }

        invoice.setTotalAmount(totalAmount.setScale(2, java.math.RoundingMode.HALF_UP));
    }

    private Map<String, Object> parseQuantityDrivers(String quantityDriversStr) {
        try {
            return objectMapper.readValue(quantityDriversStr, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON format for quantity drivers: " + quantityDriversStr, e);
        }
    }

    private void audit(String invoiceId, String action) {
        String currentUserId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ?
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : "SYSTEM";
        com.airline.domain.InvoiceAuditLog auditLog = com.airline.domain.InvoiceAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .invoiceId(invoiceId)
                .action(action)
                .userId(currentUserId)
                .timestamp(java.time.OffsetDateTime.now())
                .build();
        invoiceAuditLogRepository.save(auditLog);
    }
}
