package com.airline.api;

import com.airline.api.dto.RfpProposalCreateRequest;
import com.airline.api.dto.SupplierRfpResponse;
import com.airline.service.SupplierRfpService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/supplier/rfps")
public class SupplierRfpController {

    private final SupplierRfpService supplierRfpService;

    public SupplierRfpController(SupplierRfpService supplierRfpService) {
        this.supplierRfpService = supplierRfpService;
    }

    @GetMapping
    public List<SupplierRfpResponse> listOpportunities() {
        return supplierRfpService.listOpportunities();
    }

    @PostMapping("/{rfpId}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierRfpResponse submitProposal(
            @PathVariable String rfpId,
            @Valid @RequestBody RfpProposalCreateRequest request) {
        return supplierRfpService.submitProposal(rfpId, request);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{rfpId}/proposals/{proposalId}")
    public SupplierRfpResponse updateProposal(
            @PathVariable String rfpId,
            @PathVariable String proposalId,
            @Valid @RequestBody RfpProposalCreateRequest request) {
        return supplierRfpService.updateProposal(rfpId, proposalId, request);
    }
}
