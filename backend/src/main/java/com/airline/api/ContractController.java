package com.airline.api;

import com.airline.api.dto.ContractCreateRequest;
import com.airline.api.dto.ContractResponse;
import com.airline.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContractResponse createContract(@Valid @RequestBody ContractCreateRequest request) {
        return contractService.createContract(request);
    }

    @GetMapping
    public java.util.List<ContractResponse> listContracts(
            @RequestParam(required = false) com.airline.domain.ContractStatus status,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String serviceType) {
        return contractService.getContracts(status, airportCode, serviceType);
    }

    @PutMapping("/{id}/status")
    public ContractResponse updateContractStatus(
            @PathVariable String id,
            @Valid @RequestBody com.airline.api.dto.ContractStatusUpdateRequest request) {
        return contractService.updateContractStatus(id, request.getStatus());
    }
}
