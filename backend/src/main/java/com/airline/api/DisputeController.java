package com.airline.api;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.domain.Dispute;
import com.airline.service.DisputeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('INVOICE_DISPUTER', 'DISPUTE_HANDLER', 'DISPUTE_APPROVER')")
    public ResponseEntity<List<Dispute>> getDisputes() {
        return ResponseEntity.ok(disputeService.getDisputesForCurrentTenant());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('INVOICE_DISPUTER', 'DISPUTE_HANDLER', 'DISPUTE_APPROVER')")
    public ResponseEntity<Dispute> getDisputeById(@PathVariable String id) {
        return ResponseEntity.ok(disputeService.getDisputeById(id));
    }

    @PostMapping("/invoice/{invoiceId}")
    @PreAuthorize("hasAuthority('INVOICE_DISPUTER')")
    public ResponseEntity<Dispute> createDispute(
            @PathVariable String invoiceId,
            @RequestBody InvoiceDisputeRequest request) {
        Dispute dispute = disputeService.createDispute(invoiceId, request);
        return ResponseEntity.ok(dispute);
    }

    @PostMapping("/{id}/respond")
    @PreAuthorize("hasAnyAuthority('INVOICE_DISPUTER', 'DISPUTE_HANDLER', 'DISPUTE_APPROVER')")
    public ResponseEntity<Dispute> respondToDispute(
            @PathVariable String id,
            @RequestBody DisputeResponsePayload payload) {
        Dispute dispute = disputeService.respondToDispute(id, payload.getMessage(), payload.getAction());
        return ResponseEntity.ok(dispute);
    }

    @Data
    public static class DisputeResponsePayload {
        private String message;
        private String action;
    }
}
