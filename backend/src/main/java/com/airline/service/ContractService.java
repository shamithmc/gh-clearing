package com.airline.service;

import com.airline.api.dto.ContractCreateRequest;
import com.airline.api.dto.ContractResponse;
import com.airline.api.dto.ServiceConfigurationDTO;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractRepository;
import com.airline.security.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContractService {

    private final ContractRepository contractRepository;
    private final TenantContext tenantContext;

    public ContractService(ContractRepository contractRepository, TenantContext tenantContext) {
        this.contractRepository = contractRepository;
        this.tenantContext = tenantContext;
    }

    @Transactional
    public ContractResponse createContract(ContractCreateRequest request) {
        if (!"GROUND_HANDLER".equals(tenantContext.getCurrentTenantType())) {
            throw new org.springframework.security.access.AccessDeniedException("Only ground handlers can create contracts");
        }

        Contract contract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .groundHandlerId(tenantContext.getCurrentTenantId())
                .airlineId(request.getAirlineId())
                .airportCode(request.getAirportCode())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .currency(request.getCurrency())
                .status(ContractStatus.DRAFT) // §3.3.1 Contract Lifecycle - Initial status
                .build();

        for (ServiceConfigurationDTO svcDto : request.getServices()) {
            ServiceConfiguration svc = ServiceConfiguration.builder()
                    .id(UUID.randomUUID().toString())
                    .chargeCode(svcDto.getChargeCode())
                    .serviceName(svcDto.getServiceName())
                    .formulaType(FormulaType.fromValue(svcDto.getFormulaType()))
                    .rateDetails(svcDto.getRateDetails())
                    .quantityDriver(svcDto.getQuantityDriver())
                    .uom(svcDto.getUom())
                    .taxCode(svcDto.getTaxCode())
                    .build();
            contract.addService(svc);
        }

        contractRepository.save(contract);
        return mapToResponse(contract);
    }

    @Transactional(readOnly = true)
    public java.util.List<ContractResponse> getContracts(ContractStatus status) {
        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();

        java.util.List<Contract> contracts;

        if ("GROUND_HANDLER".equals(tenantType)) {
            if (status != null) {
                contracts = contractRepository.findByGroundHandlerIdAndStatus(tenantId, status);
            } else {
                contracts = contractRepository.findByGroundHandlerId(tenantId);
            }
        } else if ("AIRLINE".equals(tenantType)) {
            // Invisible to counterparty if DRAFT
            if (status != null) {
                if (status == ContractStatus.DRAFT) {
                    return java.util.List.of();
                }
                contracts = contractRepository.findByAirlineIdAndStatusAndStatusNot(tenantId, status, ContractStatus.DRAFT);
            } else {
                contracts = contractRepository.findByAirlineIdAndStatusNot(tenantId, ContractStatus.DRAFT);
            }
        } else {
            throw new org.springframework.security.access.AccessDeniedException("Invalid tenant type");
        }

        return contracts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public ContractResponse updateContractStatus(String id, ContractStatus targetStatus) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("Contract not found"));

        String tenantId = tenantContext.getCurrentTenantId();
        String tenantType = tenantContext.getCurrentTenantType();
        ContractStatus currentStatus = contract.getStatus();

        if (currentStatus == ContractStatus.APPROVED || currentStatus == ContractStatus.EXPIRED) {
            throw new IllegalStateException("Cannot change status of a contract that is " + currentStatus);
        }

        if ("GROUND_HANDLER".equals(tenantType)) {
            if (!contract.getGroundHandlerId().equals(tenantId)) {
                throw new org.springframework.security.access.AccessDeniedException("Contract does not belong to this tenant");
            }
            if (currentStatus == ContractStatus.DRAFT) {
                if (targetStatus != ContractStatus.PENDING_APPROVAL) {
                    throw new IllegalStateException("Draft contracts can only transition to PENDING_APPROVAL");
                }
            } else if (currentStatus == ContractStatus.REVIEW_REQUESTED) {
                if (targetStatus != ContractStatus.PENDING_APPROVAL) {
                    throw new IllegalStateException("Review requested contracts can only transition to PENDING_APPROVAL");
                }
            } else {
                throw new org.springframework.security.access.AccessDeniedException("Ground handlers cannot perform status changes on contracts in " + currentStatus + " status");
            }
        } else if ("AIRLINE".equals(tenantType)) {
            if (!contract.getAirlineId().equals(tenantId)) {
                throw new org.springframework.security.access.AccessDeniedException("Contract does not belong to this tenant");
            }
            if (currentStatus == ContractStatus.PENDING_APPROVAL) {
                if (targetStatus != ContractStatus.APPROVED && targetStatus != ContractStatus.REVIEW_REQUESTED) {
                    throw new IllegalStateException("Pending contracts can only transition to APPROVED or REVIEW_REQUESTED");
                }
            } else {
                throw new org.springframework.security.access.AccessDeniedException("Airlines cannot perform status changes on contracts in " + currentStatus + " status");
            }
        } else {
            throw new org.springframework.security.access.AccessDeniedException("Invalid tenant type");
        }

        contract.setStatus(targetStatus);
        contractRepository.save(contract);
        return mapToResponse(contract);
    }

    private ContractResponse mapToResponse(Contract contract) {
        return ContractResponse.builder()
                .id(contract.getId())
                .groundHandlerId(contract.getGroundHandlerId())
                .airlineId(contract.getAirlineId())
                .airportCode(contract.getAirportCode())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .status(contract.getStatus())
                .currency(contract.getCurrency())
                .createdAt(contract.getCreatedAt())
                .services(contract.getServices().stream().map(s -> {
                    ServiceConfigurationDTO dto = new ServiceConfigurationDTO();
                    dto.setChargeCode(s.getChargeCode());
                    dto.setServiceName(s.getServiceName());
                    dto.setFormulaType(s.getFormulaType().getValue());
                    dto.setRateDetails(s.getRateDetails());
                    dto.setQuantityDriver(s.getQuantityDriver());
                    dto.setUom(s.getUom());
                    dto.setTaxCode(s.getTaxCode());
                    return dto;
                }).collect(Collectors.toList()))
                .build();
    }
}
