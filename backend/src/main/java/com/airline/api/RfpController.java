package com.airline.api;

import com.airline.api.dto.AirlineRfpProposalResponse;
import com.airline.api.dto.RfpCreateRequest;
import com.airline.api.dto.RfpProposalDecisionRequest;
import com.airline.api.dto.RfpProposalDecisionResponse;
import com.airline.api.dto.RfpResponse;
import com.airline.service.RfpEvaluationService;
import com.airline.service.RfpService;
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
@RequestMapping("/api/rfps")
public class RfpController {

    private final RfpService rfpService;
    private final RfpEvaluationService rfpEvaluationService;

    public RfpController(RfpService rfpService, RfpEvaluationService rfpEvaluationService) {
        this.rfpService = rfpService;
        this.rfpEvaluationService = rfpEvaluationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RfpResponse create(@Valid @RequestBody RfpCreateRequest request) {
        return rfpService.create(request);
    }

    @org.springframework.web.bind.annotation.PutMapping("/{rfpId}")
    public RfpResponse update(@PathVariable String rfpId, @Valid @RequestBody RfpCreateRequest request) {
        return rfpService.update(rfpId, request);
    }

    @GetMapping
    public List<RfpResponse> listOwn() {
        return rfpService.listOwn();
    }

    @GetMapping("/{rfpId}/proposals")
    public List<AirlineRfpProposalResponse> listProposals(@PathVariable String rfpId) {
        return rfpEvaluationService.listProposals(rfpId);
    }

    @PostMapping("/{rfpId}/proposals/{proposalId}/decision")
    public RfpProposalDecisionResponse decideProposal(
            @PathVariable String rfpId,
            @PathVariable String proposalId,
            @Valid @RequestBody RfpProposalDecisionRequest request) {
        return rfpEvaluationService.decide(rfpId, proposalId, request);
    }
}
