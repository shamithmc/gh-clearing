package com.airline.contracts;

import com.airline.domain.Contract;
import com.airline.domain.ContractReviewRequest;
import com.airline.domain.ContractStatus;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractAuditLogRepository;
import com.airline.repository.ContractRepository;
import com.airline.repository.ContractReviewRequestRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.ContractReviewRequestService;
import com.airline.notification.ContractReviewRequestedEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.context.ApplicationEventPublisher;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContractReviewRequestServiceTest {

    @Mock
    private ContractReviewRequestRepository reviewRequestRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractAuditLogRepository contractAuditLogRepository;
    @Mock
    private TenantContext tenantContext;
    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    private ContractReviewRequestService service;

    @BeforeEach
    void setUp() {
        service = new ContractReviewRequestService(reviewRequestRepository, contractRepository,
                contractAuditLogRepository, tenantContext, dimensionalSecurityEvaluator,
                applicationEventPublisher);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("airline-reviewer", "n/a", "CONTRACT_REVIEWER"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void airlineReviewerCanRequestReviewWithoutMutatingApprovedContract() {
        Contract contract = approvedContract("contract-1", "SWISSPORT", "EK", "DXB", "BAGGAGE");
        airlineTenant("EK");
        when(contractRepository.findByIdAndTenantId("contract-1", "EK")).thenReturn(Optional.of(contract));

        var response = service.create("contract-1", "  Please review the baggage rate.  ");

        assertThat(response.getComment()).isEqualTo("Please review the baggage rate.");
        assertThat(response.getAirportCode()).isEqualTo("DXB");
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.APPROVED);
        verify(contractRepository, never()).save(any());

        ArgumentCaptor<ContractReviewRequest> requestCaptor = ArgumentCaptor.forClass(ContractReviewRequest.class);
        verify(reviewRequestRepository).save(requestCaptor.capture());
        assertThat(requestCaptor.getValue().getGroundHandlerId()).isEqualTo("SWISSPORT");
        assertThat(requestCaptor.getValue().getAirlineId()).isEqualTo("EK");
        verify(contractAuditLogRepository).save(any());
        verify(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", java.util.Set.of("BAGGAGE"));
        ArgumentCaptor<ContractReviewRequestedEvent> eventCaptor =
                ArgumentCaptor.forClass(ContractReviewRequestedEvent.class);
        verify(applicationEventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().groundHandlerId()).isEqualTo("SWISSPORT");
        assertThat(eventCaptor.getValue().chargeCodes()).containsExactly("BAGGAGE");
    }

    @Test
    void nonApprovedContractCannotReceiveAirlineReviewRequest() {
        Contract contract = approvedContract("contract-1", "SWISSPORT", "EK", "DXB", "BAGGAGE");
        contract.setStatus(ContractStatus.PENDING_APPROVAL);
        airlineTenant("EK");
        when(contractRepository.findByIdAndTenantId("contract-1", "EK")).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> service.create("contract-1", "Review this"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only approved contracts");
        verify(reviewRequestRepository, never()).save(any());
    }

    @Test
    void crossTenantRequestFailsClosed() {
        airlineTenant("QR");
        when(contractRepository.findByIdAndTenantId("contract-1", "QR")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create("contract-1", "Review this"))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Contract not found");
        verify(contractRepository, never()).findById("contract-1");
        verify(reviewRequestRepository, never()).save(any());
    }

    @Test
    void viewerWithoutReviewerRoleCannotSubmit() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("viewer", "n/a", "CONTRACT_VIEWER"));
        airlineTenant("EK");

        assertThatThrownBy(() -> service.create("contract-1", "Review this"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("CONTRACT_REVIEWER");
        verify(contractRepository, never()).findByIdAndTenantId(any(), any());
    }

    @Test
    void dimensionalDenialPreventsSubmission() {
        Contract contract = approvedContract("contract-1", "SWISSPORT", "EK", "DXB", "BAGGAGE");
        airlineTenant("EK");
        when(contractRepository.findByIdAndTenantId("contract-1", "EK")).thenReturn(Optional.of(contract));
        org.mockito.Mockito.doThrow(new AccessDeniedException("Airport access denied"))
                .when(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", java.util.Set.of("BAGGAGE"));

        assertThatThrownBy(() -> service.create("contract-1", "Review this"))
                .isInstanceOf(AccessDeniedException.class);
        verify(reviewRequestRepository, never()).save(any());
    }

    @Test
    void groundHandlerQueueIsTenantAndDimensionScoped() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("contract-entry", "n/a", "CONTRACT_ENTRY"));
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        Contract permitted = approvedContract("contract-1", "SWISSPORT", "EK", "DXB", "BAGGAGE");
        Contract denied = approvedContract("contract-2", "SWISSPORT", "EK", "FRA", "CLEANING");
        ContractReviewRequest request1 = reviewRequest("request-1", permitted);
        ContractReviewRequest request2 = reviewRequest("request-2", denied);
        when(reviewRequestRepository.findByGroundHandlerIdOrderByCreatedAtDesc("SWISSPORT"))
                .thenReturn(List.of(request1, request2));
        when(contractRepository.findByIdAndTenantId("contract-1", "SWISSPORT")).thenReturn(Optional.of(permitted));
        when(contractRepository.findByIdAndTenantId("contract-2", "SWISSPORT")).thenReturn(Optional.of(denied));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("FRA")).thenReturn(false);

        var queue = service.getGroundHandlerQueue();

        assertThat(queue).extracting(item -> item.getId()).containsExactly("request-1");
        verify(reviewRequestRepository).findByGroundHandlerIdOrderByCreatedAtDesc("SWISSPORT");
    }

    @Test
    void airlineCannotReadGroundHandlerQueue() {
        airlineTenant("EK");

        assertThatThrownBy(service::getGroundHandlerQueue)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only ground handlers");
        verify(reviewRequestRepository, never()).findAll();
    }

    private void airlineTenant(String tenantId) {
        when(tenantContext.getCurrentTenantId()).thenReturn(tenantId);
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
    }

    private Contract approvedContract(
            String id, String groundHandlerId, String airlineId, String airport, String chargeCode) {
        Contract contract = Contract.builder()
                .id(id)
                .groundHandlerId(groundHandlerId)
                .airlineId(airlineId)
                .airportCode(airport)
                .status(ContractStatus.APPROVED)
                .build();
        contract.addService(ServiceConfiguration.builder()
                .id("service-" + id)
                .chargeCode(chargeCode)
                .build());
        return contract;
    }

    private ContractReviewRequest reviewRequest(String id, Contract contract) {
        return ContractReviewRequest.builder()
                .id(id)
                .contractId(contract.getId())
                .groundHandlerId(contract.getGroundHandlerId())
                .airlineId(contract.getAirlineId())
                .comment("Please review")
                .requestedBy("airline-reviewer")
                .createdAt(OffsetDateTime.parse("2026-07-21T10:00:00Z"))
                .build();
    }
}
