package com.airline.service;

import com.airline.domain.Contract;
import com.airline.domain.Invoice;
import com.airline.domain.InvoiceLineItem;
import com.airline.domain.InvoiceStatus;
import com.airline.domain.InvoiceDispatchJob;
import com.airline.domain.ServiceConfiguration;
import com.airline.notification.PaymentMarkedEvent;
import com.airline.pdf.InvoicePdfService;
import com.airline.repository.ContractRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.pricing.PricingEngine;
import com.airline.security.TenantContext;
import com.airline.security.DimensionalSecurityEvaluator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.api.dto.LineItemDisputeRequest;
import com.airline.domain.DisputeCategory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ContractRepository contractRepository;
    private final PricingEngine pricingEngine;
    private final TenantContext tenantContext;
    private final ObjectMapper objectMapper;
    private final com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository;
    private final DocumentGenerationJob documentGenerationJob;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    private final ApplicationEventPublisher applicationEventPublisher;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          ContractRepository contractRepository,
                          PricingEngine pricingEngine,
                          TenantContext tenantContext,
                          ObjectMapper objectMapper,
                          com.airline.repository.InvoiceAuditLogRepository invoiceAuditLogRepository,
                          DocumentGenerationJob documentGenerationJob,
                          DimensionalSecurityEvaluator dimensionalSecurityEvaluator,
                          ApplicationEventPublisher applicationEventPublisher) {
        this.invoiceRepository = invoiceRepository;
        this.contractRepository = contractRepository;
        this.pricingEngine = pricingEngine;
        this.tenantContext = tenantContext;
        this.objectMapper = objectMapper;
        this.invoiceAuditLogRepository = invoiceAuditLogRepository;
        this.documentGenerationJob = documentGenerationJob;
        this.dimensionalSecurityEvaluator = dimensionalSecurityEvaluator;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    @Transactional
    public Invoice createInvoice(Invoice invoice) {
        String tenantType = tenantContext.getCurrentTenantType();
        String tenantId = tenantContext.getCurrentTenantId();

        if (!"GROUND_HANDLER".equals(tenantType)) {
            throw new AccessDeniedException("Only ground handlers can create invoices");
        }

        if (!tenantId.equals(invoice.getSupplierId())) {
            throw new AccessDeniedException("Cannot create invoice for a different supplier");
        }

        verifyDimensionalAccess(invoice);
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
        String tenantId = tenantContext.getCurrentTenantId();
        boolean airlineTenant = "AIRLINE".equals(tenantContext.getCurrentTenantType());
        if (airlineTenant) {
            requireRole("INVOICE_REVIEWER");
        }
        Invoice invoice = loadTenantScopedInvoice(id, tenantId);

        if (airlineTenant) {
            if (!tenantId.equals(invoice.getAirlineId()) || !isAirlineVisible(invoice)) {
                throw new java.util.NoSuchElementException("Invoice not found: " + id);
            }
        }
        return invoice;
    }

    @Transactional(readOnly = true)
    public List<Invoice> listInvoices() {
        return listInvoices(null, null, null);
    }

    @Transactional(readOnly = true)
    public List<Invoice> listInvoices(
            InvoiceStatus status, String airportCode, String serviceType) {
        String tenantId = tenantContext.getCurrentTenantId();
        boolean airlineTenant = "AIRLINE".equals(tenantContext.getCurrentTenantType());
        if (airlineTenant) {
            requireRole("INVOICE_REVIEWER");
            if (status != null && !isAirlineVisible(status)) {
                return List.of();
            }
        }

        String normalizedAirport = normalizeOptionalFilter(airportCode);
        String normalizedServiceType = normalizeOptionalFilter(serviceType);
        return invoiceRepository.findAllByTenantId(tenantId).stream()
                .filter(invoice -> !airlineTenant || isAirlineVisible(invoice))
                .filter(this::isDimensionallyPermitted)
                .filter(invoice -> status == null || invoice.getStatus() == status)
                .filter(invoice -> normalizedAirport == null
                        || normalizedAirport.equalsIgnoreCase(invoice.getAirportCode()))
                .filter(invoice -> normalizedServiceType == null
                        || invoice.getLineItems().stream().anyMatch(item ->
                                normalizedServiceType.equalsIgnoreCase(item.getChargeCode())))
                .collect(Collectors.toList());
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
        existing.setExchangeRateSource(updatedInvoice.getExchangeRateSource());
        existing.setIssueDate(updatedInvoice.getIssueDate());
        existing.setDueDate(updatedInvoice.getDueDate());

        existing.getLineItems().clear();
        if (updatedInvoice.getLineItems() != null) {
            updatedInvoice.getLineItems().forEach(item -> {
                item.setId(UUID.randomUUID().toString());
                existing.addLineItem(item);
            });
        }

        verifyDimensionalAccess(existing);
        calculateAndValidateInvoice(existing);

        Invoice saved = invoiceRepository.save(existing);
        audit(saved.getId(), "UPDATED");
        return saved;
    }

    @Transactional
    public Invoice updateInvoiceStatus(String id, InvoiceStatus targetStatus) {
        return updateInvoiceStatus(id, targetStatus, null);
    }

    @Transactional
    public Invoice updateInvoiceStatus(String id, InvoiceStatus targetStatus, String comments) {
        if (targetStatus == null) {
            throw new IllegalArgumentException("Target invoice status is required");
        }

        String tenantType = tenantContext.getCurrentTenantType();
        Invoice existing;
        if ("AIRLINE".equals(tenantType)) {
            requireRole("PAYMENT_UPDATER");
            if (targetStatus != InvoiceStatus.PAID) {
                throw new AccessDeniedException("Airlines may only mark invoices as PAID through the status endpoint");
            }
            String tenantId = tenantContext.getCurrentTenantId();
            existing = loadTenantScopedInvoice(id, tenantId);
            if (!tenantId.equals(existing.getAirlineId()) || !isAirlineVisible(existing)) {
                throw new java.util.NoSuchElementException("Invoice not found: " + id);
            }
        } else {
            existing = getInvoice(id);
        }
        InvoiceStatus currentStatus = existing.getStatus();

        if (currentStatus == targetStatus) {
            return existing;
        }

        // Validate transitions
        if (targetStatus == InvoiceStatus.FINALIZED) {
            if (currentStatus != InvoiceStatus.DRAFT && currentStatus != InvoiceStatus.MODIFICATION_REQUESTED) {
                throw new IllegalStateException("Only DRAFT or MODIFICATION_REQUESTED invoices can be FINALIZED");
            }
            existing.setComments(null); // Clear previous comments upon re-finalization
        } else if (targetStatus == InvoiceStatus.APPROVED) {
            if (currentStatus != InvoiceStatus.FINALIZED) {
                throw new IllegalStateException("Only FINALIZED invoices can be APPROVED");
            }
        } else if (targetStatus == InvoiceStatus.MODIFICATION_REQUESTED) {
            if (currentStatus != InvoiceStatus.FINALIZED) {
                throw new IllegalStateException("Only FINALIZED invoices can be marked for MODIFICATION_REQUESTED");
            }
            if (comments == null || comments.trim().isEmpty()) {
                throw new IllegalArgumentException("Comments are required when requesting modification");
            }
            existing.setComments(comments);
        } else if (targetStatus == InvoiceStatus.SENT) {
            if (currentStatus != InvoiceStatus.APPROVED) {
                throw new IllegalStateException("Only APPROVED invoices can be SENT");
            }
            String supplierId = existing.getSupplierId();
            existing = invoiceRepository.findByIdAndSupplierIdForUpdate(id, supplierId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Invoice not found: " + id));
            InvoiceDispatchJob job = documentGenerationJob.queue(existing);
            audit(existing.getId(), "DISPATCH_QUEUED", "Dispatch job " + job.getId());
            
            final String invoiceId = existing.getId();
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        documentGenerationJob.generateAndDispatch(invoiceId, supplierId);
                    }
                });
            } else {
                documentGenerationJob.generateAndDispatch(invoiceId, supplierId);
            }
            
            return existing;
        } else if (targetStatus == InvoiceStatus.DISPUTED) {
            // INV-10: An Airline user MUST NOT initiate a Dispute against an Invoice that is in DRAFT or FINALIZED status
            if (currentStatus != InvoiceStatus.SENT) {
                throw new IllegalStateException("Only SENT invoices can be DISPUTED");
            }
        } else if (targetStatus == InvoiceStatus.PAID) {
            if (currentStatus != InvoiceStatus.SENT && currentStatus != InvoiceStatus.DISPUTED) {
                throw new IllegalStateException("Only SENT or DISPUTED invoices can be marked as PAID");
            }
        }

        existing.setStatus(targetStatus);
        Invoice saved = invoiceRepository.save(existing);
        audit(saved.getId(), targetStatus.name(), comments);
        if (targetStatus == InvoiceStatus.PAID && "AIRLINE".equals(tenantType)) {
            applicationEventPublisher.publishEvent(new PaymentMarkedEvent(
                    saved.getId(),
                    saved.getInvoiceNumber(),
                    saved.getSupplierId(),
                    saved.getAirlineId(),
                    saved.getAirportCode(),
                    saved.getLineItems() == null
                            ? Set.of()
                            : saved.getLineItems().stream()
                                    .map(InvoiceLineItem::getChargeCode)
                                    .collect(Collectors.toUnmodifiableSet()),
                    saved.getTotalAmount(),
                    saved.getCurrency()));
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public InvoiceDispatchJob getDispatchStatus(String id) {
        Invoice invoice = getInvoice(id);
        return documentGenerationJob.find(invoice.getId(), invoice.getSupplierId())
                .orElseThrow(() -> new java.util.NoSuchElementException(
                        "Invoice dispatch has not been requested: " + id));
    }

    @Transactional
    public Invoice disputeInvoice(String id, InvoiceDisputeRequest request) {
        Invoice existing = getInvoice(id);
        InvoiceStatus currentStatus = existing.getStatus();

        // INV-10: An Airline user MUST NOT initiate a Dispute against an Invoice that is in DRAFT or FINALIZED status
        if (currentStatus == InvoiceStatus.DRAFT || currentStatus == InvoiceStatus.FINALIZED) {
            throw new IllegalStateException("Cannot dispute invoices in DRAFT or FINALIZED status");
        }
        if (currentStatus != InvoiceStatus.SENT) {
            throw new IllegalStateException("Only SENT invoices can be disputed");
        }

        if (request.getLineItems() == null || request.getLineItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item must be disputed");
        }

        for (LineItemDisputeRequest itemDispute : request.getLineItems()) {
            InvoiceLineItem lineItem = existing.getLineItems().stream()
                    .filter(li -> li.getId().equals(itemDispute.getLineItemId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Line item not found: " + itemDispute.getLineItemId()));

            if (itemDispute.getCategory() == null) {
                throw new IllegalArgumentException("Dispute category is required");
            }

            lineItem.setDisputed(true);
            lineItem.setDisputeCategory(itemDispute.getCategory());
            lineItem.setDisputeComment(itemDispute.getComment());
        }

        existing.setStatus(InvoiceStatus.DISPUTED);
        Invoice saved = invoiceRepository.save(existing);
        audit(saved.getId(), "DISPUTED", "Dispute raised against " + request.getLineItems().size() + " line items");
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
            Invoice persisted = invoiceRepository.findByIdAndTenantId(invoice.getId(), invoice.getSupplierId()).orElse(null);
            if (persisted != null && !persisted.getInvoiceNumber().equals(invoice.getInvoiceNumber())) {
                if (invoiceRepository.existsByInvoiceNumberAndAirlineIdAndSupplierId(
                        invoice.getInvoiceNumber(), invoice.getAirlineId(), invoice.getSupplierId())) {
                    throw new IllegalArgumentException("Invoice number must be unique per airline-supplier pair");
                }
            }
        }

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (invoice.getLineItems() != null) {
            for (com.airline.domain.InvoiceLineItem item : invoice.getLineItems()) {
                com.airline.domain.Contract contract = contractRepository.findByIdAndTenantId(
                                item.getContractId(), invoice.getSupplierId())
                        .orElseThrow(() -> new IllegalArgumentException("Contract not found for id: " + item.getContractId()));

                if (!invoice.getSupplierId().equals(contract.getGroundHandlerId())
                        || !invoice.getAirlineId().equals(contract.getAirlineId())
                        || !invoice.getAirportCode().equals(contract.getAirportCode())) {
                    throw new AccessDeniedException(
                            "Invoice supplier, airline, and airport must match the referenced contract");
                }

                // Enforce contract validity check
                if (invoice.getIssueDate().isBefore(contract.getStartDate()) || invoice.getIssueDate().isAfter(contract.getEndDate())) {
                    throw new IllegalArgumentException("Invoice issue date must fall within contract validity period");
                }

                com.airline.domain.ServiceConfiguration serviceConfig = contract.getServices().stream()
                        .filter(s -> s.getChargeCode().equals(item.getChargeCode()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Charge code " + item.getChargeCode() + " not configured on contract"));

                Map<String, Object> flightInputs = parseQuantityDrivers(item.getQuantityDrivers());

                // Enforce INV-05: PF-07 Tail ID Requirement
                if (serviceConfig.getFormulaType() == com.airline.domain.FormulaType.PF_07) {
                    if (item.getAircraftReg() == null || item.getAircraftReg().trim().isEmpty()) {
                        throw new IllegalArgumentException("Aircraft registration is required for formula type PF-07");
                    }
                    flightInputs.put("tailNumber", item.getAircraftReg());
                }

                item.setServiceName(serviceConfig.getServiceName());
                item.setFormulaType(serviceConfig.getFormulaType().getValue());

                BigDecimal baseCharge = pricingEngine.calculateCharge(serviceConfig, flightInputs);

                // Enforce INV-06: Cross-Currency Exchange Rate Mandate
                BigDecimal finalAmount;
                if (!contract.getCurrency().equalsIgnoreCase(invoice.getCurrency())) {
                    if (invoice.getExchangeRate() == null || invoice.getExchangeRate().compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Exchange rate must be provided and positive when invoice and contract currencies differ");
                    }
                    if (invoice.getExchangeRateSource() == null || invoice.getExchangeRateSource().isBlank()) {
                        throw new IllegalArgumentException("Exchange rate source is required when invoice and contract currencies differ");
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

    private void verifyDimensionalAccess(Invoice invoice) {
        Set<String> chargeCodes = invoice.getLineItems() == null
                ? Set.of()
                : invoice.getLineItems().stream()
                        .map(InvoiceLineItem::getChargeCode)
                        .collect(Collectors.toSet());
        dimensionalSecurityEvaluator.verifyAccess(
                invoice.getAirportCode(), invoice.getAirlineId(), chargeCodes);
    }

    private boolean isDimensionallyPermitted(Invoice invoice) {
        if (!dimensionalSecurityEvaluator.isAirportPermitted(invoice.getAirportCode())
                || !dimensionalSecurityEvaluator.isAirlinePermitted(invoice.getAirlineId())) {
            return false;
        }
        return invoice.getLineItems() == null || invoice.getLineItems().stream()
                .allMatch(item -> dimensionalSecurityEvaluator.isChargeCodePermitted(item.getChargeCode()));
    }

    private Invoice loadTenantScopedInvoice(String id, String tenantId) {
        Invoice invoice = invoiceRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Invoice not found: " + id));
        verifyDimensionalAccess(invoice);
        return invoice;
    }

    private boolean isAirlineVisible(Invoice invoice) {
        return invoice != null && isAirlineVisible(invoice.getStatus());
    }

    private boolean isAirlineVisible(InvoiceStatus status) {
        return status == InvoiceStatus.SENT
                || status == InvoiceStatus.PAID
                || status == InvoiceStatus.DISPUTED;
    }

    private String normalizeOptionalFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private void requireRole(String role) {
        org.springframework.security.core.Authentication authentication =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean permitted = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> role.equals(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("Required role is missing: " + role);
        }
    }

    private Map<String, Object> parseQuantityDrivers(String quantityDriversStr) {
        try {
            return objectMapper.readValue(quantityDriversStr, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON format for quantity drivers: " + quantityDriversStr, e);
        }
    }

    private void audit(String invoiceId, String action) {
        audit(invoiceId, action, null);
    }

    private void audit(String invoiceId, String action, String comments) {
        String currentUserId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ?
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : "SYSTEM";
        com.airline.domain.InvoiceAuditLog auditLog = com.airline.domain.InvoiceAuditLog.builder()
                .id(UUID.randomUUID().toString())
                .invoiceId(invoiceId)
                .action(action)
                .userId(currentUserId)
                .comments(comments)
                .timestamp(java.time.OffsetDateTime.now())
                .build();
        invoiceAuditLogRepository.save(auditLog);
    }
}
