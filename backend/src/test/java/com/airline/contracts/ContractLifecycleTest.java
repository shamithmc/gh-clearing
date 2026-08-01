package com.airline.contracts;

import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.repository.ContractRepository;
import com.airline.security.TenantContext;
import com.airline.service.ContractService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

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

    @Mock
    private com.airline.security.DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @Mock
    private com.airline.repository.ContractAuditLogRepository contractAuditLogRepository;

    @InjectMocks
    private ContractService contractService;

    @BeforeEach
    void authenticateContractRoles() {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "user-1", "n/a", "CONTRACT_ENTRY", "CONTRACT_APPROVER", "CONTRACT_REVIEWER"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void ghCanSubmitDraftContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.DRAFT)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.PENDING_APPROVAL);
        verify(contractRepository).save(contract);
        verify(contractAuditLogRepository).save(any(com.airline.domain.ContractAuditLog.class));
    }

    @Test
    void ghCannotApproveDraftContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.DRAFT)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.APPROVED))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Draft contracts can only transition to PENDING_APPROVAL");
    }

    @Test
    void groundHandlerApproverCanApprovePendingContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.PENDING_APPROVAL)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        contractService.updateContractStatus("c-001", ContractStatus.APPROVED);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.APPROVED);
        verify(contractRepository).save(contract);
        verify(contractAuditLogRepository).save(any(com.airline.domain.ContractAuditLog.class));
    }

    @Test
    void airlineCanRequestReviewForPendingContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.PENDING_APPROVAL)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(contractRepository.findByIdAndTenantId("c-001", "EK")).thenReturn(Optional.of(contract));

        contractService.updateContractStatus("c-001", ContractStatus.REVIEW_REQUESTED);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.REVIEW_REQUESTED);
        verify(contractRepository).save(contract);
        verify(contractAuditLogRepository).save(any(com.airline.domain.ContractAuditLog.class));
    }

    @Test
    void airlineCannotApprovePendingContract() {
        Contract contract = Contract.builder()
                .id("c-001").groundHandlerId("SWISSPORT").airlineId("EK")
                .status(ContractStatus.PENDING_APPROVAL).build();
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
        when(contractRepository.findByIdAndTenantId("c-001", "EK")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.APPROVED))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("cannot approve");
        verify(contractRepository, never()).save(any());
    }

    @Test
    void transitionWithoutRequiredRoleFailsClosed() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("viewer", "n/a", "MIS_VIEWER"));
        Contract contract = Contract.builder()
                .id("c-001").groundHandlerId("SWISSPORT").airlineId("EK")
                .status(ContractStatus.DRAFT).build();
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("CONTRACT_ENTRY");
        verify(contractRepository, never()).save(any());
    }

    @Test
    void ghCanResubmitReviewRequestedContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.REVIEW_REQUESTED)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL);

        assertThat(contract.getStatus()).isEqualTo(ContractStatus.PENDING_APPROVAL);
        verify(contractRepository).save(contract);
        verify(contractAuditLogRepository).save(any(com.airline.domain.ContractAuditLog.class));
    }

    @Test
    void cannotTransitionFromApprovedContract() {
        Contract contract = Contract.builder()
                .id("c-001")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .status(ContractStatus.APPROVED)
                .build();

        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "SWISSPORT")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot change status of a contract that is APPROVED");
    }

    @Test
    void crossTenantTransitionShouldFail() {
        when(tenantContext.getCurrentTenantId()).thenReturn("OTHER_GH");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(contractRepository.findByIdAndTenantId("c-001", "OTHER_GH")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.updateContractStatus("c-001", ContractStatus.PENDING_APPROVAL))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Contract not found");
        verify(contractRepository, never()).save(any());
    }
}
