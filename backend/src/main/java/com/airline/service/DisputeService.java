package com.airline.service;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.api.dto.LineItemDisputeRequest;
import com.airline.domain.*;
import com.airline.repository.DisputeRepository;
import com.airline.repository.InvoiceRepository;
import com.airline.security.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final TenantContext tenantContext;

    @Transactional(readOnly = true)
    public List<Dispute> getDisputesForCurrentTenant() {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();
        List<Dispute> disputes = disputeRepository.findAllForTenant(tenantId, tenantType);
        disputes.forEach(this::initializeResponseAssociations);
        return disputes;
    }

    @Transactional(readOnly = true)
    public Dispute getDisputeById(String id) {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();

        Dispute dispute;
        if ("AIRLINE".equals(tenantType)) {
            dispute = disputeRepository.findByIdAndAirlineId(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        } else {
            dispute = disputeRepository.findByIdAndSupplierId(id, tenantId)
                    .orElseThrow(() -> new java.util.NoSuchElementException("Dispute not found: " + id));
        }
        initializeResponseAssociations(dispute);
        return dispute;
    }

    @Transactional
    public Dispute createDispute(String invoiceId, InvoiceDisputeRequest request) {
        String tenantId = tenantContext.getCurrentTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(invoiceId, tenantId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Invoice not found: " + invoiceId));

        // INV-10: An Airline user MUST NOT initiate a Dispute against an Invoice that is in DRAFT or FINALIZED status
        if (invoice.getStatus() == InvoiceStatus.DRAFT || invoice.getStatus() == InvoiceStatus.FINALIZED) {
            throw new IllegalStateException("Cannot dispute invoices in DRAFT or FINALIZED status");
        }
        if (invoice.getStatus() != InvoiceStatus.SENT) {
            throw new IllegalStateException("Only SENT invoices can be disputed");
        }

        if (request.getLineItems() == null || request.getLineItems().isEmpty()) {
            throw new IllegalArgumentException("At least one line item must be disputed");
        }

        BigDecimal totalDisputed = BigDecimal.ZERO;
        List<DisputeLineItem> lineItems = new ArrayList<>();
        DisputeCategory primaryCategory = DisputeCategory.MISCELLANEOUS;

        for (LineItemDisputeRequest itemReq : request.getLineItems()) {
            InvoiceLineItem item = invoice.getLineItems().stream()
                    .filter(li -> li.getId().equals(itemReq.getLineItemId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Line item not found: " + itemReq.getLineItemId()));

            if (itemReq.getCategory() == null) {
                throw new IllegalArgumentException("Dispute category is required");
            }

            primaryCategory = itemReq.getCategory();
            BigDecimal amount = item.getCalculatedAmount() != null ? item.getCalculatedAmount() : BigDecimal.ZERO;
            totalDisputed = totalDisputed.add(amount);

            item.setDisputed(true);
            item.setDisputeCategory(itemReq.getCategory());
            item.setDisputeComment(itemReq.getComment());

            DisputeLineItem dli = DisputeLineItem.builder()
                    .id(UUID.randomUUID().toString())
                    .lineItemId(item.getId())
                    .chargeCode(item.getChargeCode() != null ? item.getChargeCode() : "GENERAL")
                    .disputedAmount(amount)
                    .reason(itemReq.getComment())
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
                .senderUserId(tenantId + "-user")
                .message("Dispute initiated against invoice " + invoice.getInvoiceNumber())
                .action("OPENED")
                .build();
        dispute.getMessages().add(initialMsg);

        return disputeRepository.save(dispute);
    }

    @Transactional
    public Dispute respondToDispute(String disputeId, String responseMessage, String action) {
        Dispute dispute = getDisputeById(disputeId);
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();

        if (responseMessage == null || responseMessage.trim().isEmpty()) {
            throw new IllegalArgumentException("Response message is required");
        }

        if ("ACCEPT".equalsIgnoreCase(action) || "ACCEPTED".equalsIgnoreCase(action)) {
            dispute.setStatus(DisputeStatus.ACCEPTED);
            // Auto-generate Credit Note (INV-11)
            invoiceService.generateCreditNote(dispute.getInvoiceId(), dispute.getDisputedAmount(), "Dispute accepted: " + responseMessage);
            dispute.setCreditNoteAmount(dispute.getDisputedAmount());
        } else if ("REJECT".equalsIgnoreCase(action) || "REJECTED".equalsIgnoreCase(action)) {
            dispute.setStatus(DisputeStatus.REJECTED);
        } else if ("ESCALATE".equalsIgnoreCase(action) || "ESCALATED".equalsIgnoreCase(action)) {
            dispute.setStatus(DisputeStatus.ESCALATED);
        } else {
            dispute.setStatus(DisputeStatus.RESPONDED);
        }

        dispute.setLatestResponse(responseMessage);

        DisputeMessage msg = DisputeMessage.builder()
                .id(UUID.randomUUID().toString())
                .dispute(dispute)
                .senderTenantId(tenantId)
                .senderTenantType(tenantType)
                .senderUserId(tenantId + "-user")
                .message(responseMessage)
                .action(action != null ? action.toUpperCase() : "RESPONDED")
                .build();
        dispute.getMessages().add(msg);

        return disputeRepository.save(dispute);
    }

    private void initializeResponseAssociations(Dispute dispute) {
        // Controllers return the domain object after the service transaction closes.
        // Load both lazy collections here so JSON serialization cannot fail later.
        dispute.getLineItems().size();
        dispute.getMessages().size();
    }
}
