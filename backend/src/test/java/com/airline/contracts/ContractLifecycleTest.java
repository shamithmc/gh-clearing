package com.airline.contracts;

import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.repository.ContractRepository;
import com.airline.security.TenantContext;
import com.airline.service.ContractService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * INV-03: Contract State Transition Guard
 * Verifies that status changes (e.g. Draft -> Pending -> Approved) follow defined roles
 * and conform to the lifecycle state machine.
 */
@ExtendWith(MockitoExtension.class)
public class ContractLifecycleTest {

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private TenantContext tenantContext;

    @InjectMocks
    private ContractService contractService;

    @Test
    void ghCanSubmitDraftContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.DRAFT)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.PENDING_APPROVAL);
        verify(contractRepository).save(contract);
    }

    @Test
    void ghCannotApproveDraftContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.DRAFT)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.APPROVED))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Draft contracts can only transition to PENDING_APPROVAL");
    }

    @Test
    void airlineCanApprovePendingContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.PENDING_APPROVAL)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");

        contractService.updateContractStatus("c-001", ContractStatus.APPROVED);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.APPROVED);
        verify(contractRepository).save(contract);
    }

    @Test
    void airlineCanRequestReviewForPendingContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.PENDING_APPROVAL)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");

        contractService.updateContractStatus("c-001", ContractStatus.REVIEW_REQUESTED);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.REVIEW_REQUESTED);
        verify(contractRepository).save(contract);
    }

    @Test
    void ghCanResubmitReviewRequestedContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.REVIEW_REQUESTED)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.PENDING_APPROVAL);
        verify(contractRepository).save(contract);
    }

    @Test
    void cannotTransitionFromApprovedContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.APPROVED)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot change status of a contract that is APPROVED");
    }

    @Test
    void crossTenantTransitionShouldFail() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.DRAFT)
                .build();

        when(contractRepository.findById("c-001")).thenReturn(Optional.of(contract));
        when(tenantContext.getCurrentTenantId()).thenReturn("OTHER_GH");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Contract does not belong to this tenant");
    }
}
