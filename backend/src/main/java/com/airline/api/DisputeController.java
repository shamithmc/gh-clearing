package com.airline.api;

import com.airline.api.dto.InvoiceDisputeRequest;
import com.airline.domain.Dispute;
import com.airline.service.DisputeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @GetMapping
    public ResponseEntity<List<Dispute>> getDisputes() {
        return ResponseEntity.ok(disputeService.getDisputesForCurrentTenant());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Dispute> getDisputeById(@PathVariable String id) {
        return ResponseEntity.ok(disputeService.getDisputeById(id));
    }

    @PostMapping("/invoice/{invoiceId}")
    public ResponseEntity<Dispute> createDispute(
            @PathVariable String invoiceId,
            @RequestBody InvoiceDisputeRequest request) {
        Dispute dispute = disputeService.createDispute(invoiceId, request);
        return ResponseEntity.ok(dispute);
    }

    @PostMapping("/{id}/respond")
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
