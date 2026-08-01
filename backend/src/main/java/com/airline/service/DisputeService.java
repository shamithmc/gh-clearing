package com.airline.service;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.api.dto.LineItemDisputeRequest;
import com.airline.domain.*;
import com.airline.repository.DisputeRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final InvoiceRepository invoiceRepository;
    private final CreditNoteService creditNoteService;
    private final TenantContext tenantContext;
    private final DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @Transactional(readOnly = true)
    public List<Dispute> getDisputesForCurrentTenant() {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = requireDisputeReader();
        List<Dispute> disputes = disputeRepository.findAllForTenant(tenantId, tenantType);
        disputes.forEach(dispute -> {
            initializeResponseAssociations(dispute);
            verifyDisputeDimensions(dispute);
        });
        return disputes;
    }

    @Transactional(readOnly = true)
    public Dispute getDisputeById(String id) {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = requireDisputeReader();

        Dispute dispute;
        if ("AIRLINE".equals(tenantType)) {
            dispute = disputeRepository.findByIdAndAirlineId(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        } else {
            dispute = disputeRepository.findByIdAndSupplierId(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        }
        initializeResponseAssociations(dispute);
        verifyDisputeDimensions(dispute);
        return dispute;
    }

    @Transactional
    public Dispute createDispute(String invoiceId, InvoiceDisputeRequest request) {
        String tenantId = requireTenantRole("AIRLINE", "INVOICE_DISPUTER");
        Invoice invoice = invoiceRepository.findByIdAndTenantId(invoiceId, tenantId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Invoice not found: " + invoiceId));

        if (!tenantId.equals(invoice.getAirlineId())) {
            throw new AccessDeniedException("Only the billed airline can initiate a dispute");
        }
        dimensionalSecurityEvaluator.verifyAccess(
                invoice.getAirportCode(),
                invoice.getAirlineId(),
                invoice.getLineItems().stream()
                        .map(InvoiceLineItem::getChargeCode)
                        .collect(Collectors.toSet()));

        // INV-10: An Airline user MUST NOT initiate a Dispute against an Invoice that is in DRAFT or FINALIZED status
        if (invoice.getStatus() == InvoiceStatus.DRAFT || invoice.getStatus() == InvoiceStatus.FINALIZED) {
            throw new IllegalStateException("Cannot dispute invoices in DRAFT or FINALIZED status");
        }
        if (invoice.getStatus() != InvoiceStatus.SENT) {
            throw new IllegalStateException("Only SENT invoices can be disputed");
        }

        if (request == null || request.getLineItems() == null || request.getLineItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item must be disputed");
        }

        BigDecimal totalDisputed = BigDecimal.ZERO;
        List<DisputeLineItem> lineItems = new ArrayList<>();
        DisputeCategory primaryCategory = DisputeCategory.MISCELLANEOUS;

        for (LineItemDisputeRequest itemReq : request.getLineItems()) {
            if (itemReq == null) {
                throw new IllegalArgumentException("Disputed line item is required");
            }
            InvoiceLineItem item = invoice.getLineItems().stream()
                    .filter(li -> li.getId().equals(itemReq.getLineItemId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Line item not found: " + itemReq.getLineItemId()));

            if (itemReq.getCategory() == null) {
                throw new IllegalArgumentException("Dispute category is required");
            }
            if (itemReq.getComment() == null || itemReq.getComment().trim().isEmpty()) {
                throw new IllegalArgumentException("Dispute comment is required for every line item");
            }

            primaryCategory = itemReq.getCategory();
            String comment = itemReq.getComment().trim();
            BigDecimal amount = item.getCalculatedAmount() != null ? item.getCalculatedAmount() : BigDecimal.ZERO;
            totalDisputed = totalDisputed.add(amount);

            item.setDisputed(true);
            item.setDisputeCategory(itemReq.getCategory());
            item.setDisputeComment(comment);

            DisputeLineItem dli = DisputeLineItem.builder()
                    .id(UUID.randomUUID().toString())
                    .lineItemId(item.getId())
                    .chargeCode(item.getChargeCode() != null ? item.getChargeCode() : "GENERAL")
                    .disputedAmount(amount)
                    .reason(comment)
                    .build();
            lineItems.add(dli);
        }

        invoice.setStatus(InvoiceStatus.DISPUTED);
        invoiceRepository.save(invoice);

        String disputeId = UUID.randomUUID().toString();
        String disputeNumber = "DSP-" + invoice.getInvoiceNumber() + "-" + (System.currentTimeMillis() % 10000);

        Dispute dispute = Dispute.builder()
                .id(disputeId)
                .disputeNumber(disputeNumber)
                .invoiceId(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .airlineId(invoice.getAirlineId())
                .supplierId(invoice.getSupplierId())
                .airportCode(invoice.getAirportCode())
                .status(DisputeStatus.OPEN)
                .category(primaryCategory)
                .disputedAmount(totalDisputed)
                .creditNoteAmount(BigDecimal.ZERO)
                .initiatorComment(request.getLineItems().get(0).getComment())
                .latestResponse(null)
                .build();

        for (DisputeLineItem dli : lineItems) {
            dli.setDispute(dispute);
            dispute.getLineItems().add(dli);
        }

        DisputeMessage initialMsg = DisputeMessage.builder()
                .id(UUID.randomUUID().toString())
                .dispute(dispute)
                .senderTenantId(tenantId)
                .senderTenantType("AIRLINE")
                .senderUserId(currentUserId())
                .message(request.getLineItems().get(0).getComment().trim())
                .action("OPENED")
                .build();
        dispute.getMessages().add(initialMsg);

        return disputeRepository.save(dispute);
    }

    @Transactional
    public Dispute respondToDispute(String disputeId, String responseMessage, String action) {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();
        Dispute dispute = getDisputeForUpdate(disputeId, tenantId, tenantType);
        DisputeAction disputeAction = DisputeAction.parse(action);

        if (responseMessage == null || responseMessage.trim().isEmpty()) {
            throw new IllegalArgumentException("Response message is required");
        }

        applyTransition(dispute, disputeAction, tenantType, responseMessage.trim());

        dispute.setLatestResponse(responseMessage.trim());

        DisputeMessage msg = DisputeMessage.builder()
                .id(UUID.randomUUID().toString())
                .dispute(dispute)
                .senderTenantId(tenantId)
                .senderTenantType(tenantType)
                .senderUserId(currentUserId())
                .message(responseMessage.trim())
                .action(disputeAction.name())
                .build();
        dispute.getMessages().add(msg);

        return disputeRepository.save(dispute);
    }

    private void applyTransition(
            Dispute dispute,
            DisputeAction action,
            String tenantType,
            String responseMessage) {
        if ("GROUND_HANDLER".equals(tenantType)) {
            applyGroundHandlerTransition(dispute, action, responseMessage);
            return;
        }
        if ("AIRLINE".equals(tenantType)) {
            applyAirlineTransition(dispute, action);
            return;
        }
        throw new AccessDeniedException("Dispute actions are unavailable to the current tenant type");
    }

    private void applyGroundHandlerTransition(
            Dispute dispute,
            DisputeAction action,
            String responseMessage) {
        switch (action) {
            case ACKNOWLEDGE -> {
                requireRole("DISPUTE_HANDLER");
                requireState(dispute, action, DisputeStatus.OPEN);
                dispute.setStatus(DisputeStatus.UNDER_REVIEW);
            }
            case RESPOND -> {
                requireRole("DISPUTE_HANDLER");
                requireState(dispute, action, DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW);
                dispute.setStatus(DisputeStatus.RESPONDED);
            }
            case REJECT -> {
                requireRole("DISPUTE_HANDLER");
                requireState(dispute, action, DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW);
                dispute.setStatus(DisputeStatus.REJECTED);
            }
            case ESCALATE -> {
                requireRole("DISPUTE_HANDLER");
                requireState(dispute, action, DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW);
                dispute.setStatus(DisputeStatus.ESCALATED);
            }
            case ACCEPT -> {
                requireRole("DISPUTE_APPROVER");
                requireState(dispute, action,
                        DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.RESPONDED);
                CreditNote creditNote = creditNoteService.generateForAcceptedDispute(
                        dispute, "Dispute accepted: " + responseMessage);
                dispute.setCreditNoteAmount(creditNote.getAmount());
                dispute.setStatus(DisputeStatus.ACCEPTED);
            }
        }
    }

    private void applyAirlineTransition(Dispute dispute, DisputeAction action) {
        requireRole("INVOICE_DISPUTER");
        switch (action) {
            case RESPOND -> {
                requireState(dispute, action, DisputeStatus.RESPONDED, DisputeStatus.REJECTED);
                dispute.setStatus(DisputeStatus.OPEN);
            }
            case ESCALATE -> {
                requireState(dispute, action, DisputeStatus.RESPONDED, DisputeStatus.REJECTED);
                dispute.setStatus(DisputeStatus.ESCALATED);
            }
            default -> throw new AccessDeniedException(
                    "Airline users cannot perform dispute action: " + action);
        }
    }

    private void requireState(
            Dispute dispute,
            DisputeAction action,
            DisputeStatus... allowedStatuses) {
        if (!Set.of(allowedStatuses).contains(dispute.getStatus())) {
            throw new IllegalStateException(
                    "Cannot " + action + " dispute in status " + dispute.getStatus());
        }
    }

    private Dispute getDisputeForUpdate(String id, String tenantId, String tenantType) {
        Dispute dispute;
        if ("AIRLINE".equals(tenantType)) {
            dispute = disputeRepository.findByIdAndAirlineIdForUpdate(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        } else if ("GROUND_HANDLER".equals(tenantType)) {
            dispute = disputeRepository.findByIdAndSupplierIdForUpdate(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        } else {
            throw new AccessDeniedException("Dispute actions are unavailable to the current tenant type");
        }
        initializeResponseAssociations(dispute);
        verifyDisputeDimensions(dispute);
        return dispute;
    }

    private String requireDisputeReader() {
        String tenantType = tenantContext.getCurrentTenantType();
        if ("AIRLINE".equals(tenantType)) {
            requireRole("INVOICE_DISPUTER");
        } else if ("GROUND_HANDLER".equals(tenantType)) {
            requireAnyRole(Set.of("DISPUTE_HANDLER", "DISPUTE_APPROVER"));
        } else {
            throw new AccessDeniedException("Disputes are unavailable to the current tenant type");
        }
        return tenantType;
    }

    private String requireTenantRole(String tenantType, String role) {
        if (!tenantType.equals(tenantContext.getCurrentTenantType())) {
            throw new AccessDeniedException("This dispute operation is not available to the current tenant type");
        }
        requireRole(role);
        return tenantContext.getCurrentTenantId();
    }

    private void requireRole(String role) {
        requireAnyRole(Set.of(role));
    }

    private void requireAnyRole(Set<String> roles) {
        Authentication authentication = currentAuthentication();
        boolean permitted = authentication.getAuthorities().stream()
                .anyMatch(authority -> roles.contains(authority.getAuthority()));
        if (!permitted) {
            throw new AccessDeniedException("One of the required roles is missing: " + roles);
        }
    }

    private String currentUserId() {
        return currentAuthentication().getName();
    }

    private Authentication currentAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authenticated user is required");
        }
        return authentication;
    }

    private void verifyDisputeDimensions(Dispute dispute) {
        Set<String> chargeCodes = dispute.getLineItems().stream()
                .map(DisputeLineItem::getChargeCode)
                .filter(code -> code != null && !code.isBlank())
                .collect(Collectors.toSet());
        dimensionalSecurityEvaluator.verifyAccess(
                dispute.getAirportCode(), dispute.getAirlineId(), chargeCodes);
    }

    private void initializeResponseAssociations(Dispute dispute) {
        // Controllers return the domain object after the service transaction closes.
        // Load both lazy collections here so JSON serialization cannot fail later.
        dispute.getLineItems().size();
        dispute.getMessages().size();
    }
}
