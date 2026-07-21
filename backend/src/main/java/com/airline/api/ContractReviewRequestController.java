package com.airline.api;

import com.airline.api.dto.ContractReviewRequestCreate;
import com.airline.api.dto.ContractReviewRequestResponse;
import com.airline.service.ContractReviewRequestService;
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
@RequestMapping("/api")
public class ContractReviewRequestController {

    private final ContractReviewRequestService reviewRequestService;

    public ContractReviewRequestController(ContractReviewRequestService reviewRequestService) {
        this.reviewRequestService = reviewRequestService;
    }

    @PostMapping("/contracts/{contractId}/review-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractReviewRequestResponse create(
            @PathVariable String contractId,
            @Valid @RequestBody ContractReviewRequestCreate request) {
        return reviewRequestService.create(contractId, request.getComment());
    }

    @GetMapping("/contract-review-requests")
    public List<ContractReviewRequestResponse> getGroundHandlerQueue() {
        return reviewRequestService.getGroundHandlerQueue();
    }
}
