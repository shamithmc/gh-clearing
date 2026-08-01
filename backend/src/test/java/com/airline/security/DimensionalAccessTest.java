package com.airline.security;

import com.airline.api.dto.ContractCreateRequest;
import com.airline.api.dto.ContractResponse;
import com.airline.api.dto.ServiceConfigurationDTO;
import com.airline.domain.*;
import com.airline.repository.ContractRepository;
import com.airline.repository.UserRepository;
import com.airline.service.ContractService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * INV-02: Dimensional Scope Enforcement
 * Verifies that contract read and write operations are filtered or blocked based on user's dimensional restrictions.
 */
@ExtendWith(MockitoExtension.class)
class DimensionalAccessTest {

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TenantContext tenantContext;

    @Mock
    private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;

    @Mock
    private com.airline.repository.ContractAuditLogRepository contractAuditLogRepository;

    @InjectMocks
    private ContractService contractService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(String userId) {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn(userId);
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("CONTRACT_ENTRY")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void evaluator_withoutJwtAuthentication_failsClosed() {
        SecurityContextHolder.clearContext();
        DimensionalSecurityEvaluator evaluator =
                new DimensionalSecurityEvaluator(userRepository, tenantContext);

        assertThatThrownBy(() -> evaluator.verifyAccess("DXB", "EK", Set.of("BAGGAGE")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("JWT authentication");
    }

    @Test
    void evaluator_withUnprovisionedUser_failsClosed() {
        mockSecurityContext("unknown-user");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(userRepository.findByIdAndTenantId("unknown-user", "SWISSPORT"))
                .thenReturn(Optional.empty());
        DimensionalSecurityEvaluator evaluator =
                new DimensionalSecurityEvaluator(userRepository, tenantContext);

        assertThatThrownBy(() -> evaluator.isAirportPermitted("DXB"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not provisioned");
    }

    @Test
    void evaluator_withUserFromDifferentTenant_failsClosedAtRepositoryBoundary() {
        mockSecurityContext("user-1");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(userRepository.findByIdAndTenantId("user-1", "SWISSPORT"))
                .thenReturn(Optional.empty());
        DimensionalSecurityEvaluator evaluator =
                new DimensionalSecurityEvaluator(userRepository, tenantContext);

        assertThatThrownBy(() -> evaluator.isAirlinePermitted("EK"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not provisioned");
    }

    @Test
    void evaluator_enforcesAirportAirlineAndChargeCodeRestrictions() {
        mockSecurityContext("user-1");
        User user = User.builder()
                .id("user-1")
                .tenantId("SWISSPORT")
                .airportRestrictions(Set.of("DXB"))
                .airlineRestrictions(Set.of("EK"))
                .chargeCodeRestrictions(Set.of("BAGGAGE"))
                .build();
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(userRepository.findByIdAndTenantId("user-1", "SWISSPORT"))
                .thenReturn(Optional.of(user));
        DimensionalSecurityEvaluator evaluator =
                new DimensionalSecurityEvaluator(userRepository, tenantContext);

        evaluator.verifyAccess("DXB", "EK", Set.of("BAGGAGE"));
        assertThat(evaluator.isAirportPermitted("LHR")).isFalse();
        assertThat(evaluator.isAirlinePermitted("LH")).isFalse();
        assertThat(evaluator.isChargeCodePermitted("CATERING")).isFalse();
        assertThatThrownBy(() -> evaluator.verifyAccess("DXB", "EK", Set.of("CATERING")))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("CATERING");
    }

    @Test
    void listInvoices_filtersEveryRestrictedDimension() {
        com.airline.repository.InvoiceRepository invoiceRepository =
                mock(com.airline.repository.InvoiceRepository.class);
        com.airline.service.InvoiceService invoiceService = new com.airline.service.InvoiceService(
                invoiceRepository,
                contractRepository,
                mock(com.airline.pricing.PricingEngine.class),
                tenantContext,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                mock(com.airline.repository.InvoiceAuditLogRepository.class),
                mock(com.airline.service.DocumentGenerationJob.class),
                dimensionalSecurityEvaluator,
                mock(com.airline.xml.IsXmlGeneratorService.class),
                mock(org.springframework.context.ApplicationEventPublisher.class));
        Invoice permitted = Invoice.builder().id("i1").airportCode("DXB").airlineId("EK")
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode("BAGGAGE").build())).build();
        Invoice restricted = Invoice.builder().id("i2").airportCode("DXB").airlineId("EK")
                .lineItems(List.of(InvoiceLineItem.builder().chargeCode("CATERING").build())).build();
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(invoiceRepository.findAllByTenantId("SWISSPORT")).thenReturn(List.of(permitted, restricted));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CATERING")).thenReturn(false);

        assertThat(invoiceService.listInvoices()).extracting(Invoice::getId).containsExactly("i1");
    }

    @Test
    void getDispute_enforcesEveryRestrictedDimension() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getSubject()).thenReturn("dispute-handler");
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt, List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("DISPUTE_HANDLER"))));

        com.airline.repository.DisputeRepository disputeRepository =
                mock(com.airline.repository.DisputeRepository.class);
        com.airline.service.DisputeService disputeService = new com.airline.service.DisputeService(
                disputeRepository,
                mock(com.airline.repository.InvoiceRepository.class),
                mock(com.airline.service.InvoiceService.class),
                tenantContext,
                dimensionalSecurityEvaluator);
        Dispute dispute = Dispute.builder()
                .id("dispute-1")
                .airlineId("EK")
                .supplierId("SWISSPORT")
                .airportCode("DXB")
                .status(DisputeStatus.OPEN)
                .lineItems(new ArrayList<>())
                .messages(new ArrayList<>())
                .build();
        dispute.getLineItems().add(DisputeLineItem.builder()
                .id("line-1")
                .dispute(dispute)
                .chargeCode("BAGGAGE")
                .build());
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(disputeRepository.findByIdAndSupplierId("dispute-1", "SWISSPORT"))
                .thenReturn(Optional.of(dispute));

        assertThat(disputeService.getDisputeById("dispute-1")).isSameAs(dispute);
        verify(dimensionalSecurityEvaluator).verifyAccess("DXB", "EK", Set.of("BAGGAGE"));
    }

    @Test
    void createContract_withPermittedDimensions_succeeds() {
        mockSecurityContext("user-1");

        ContractCreateRequest request = new ContractCreateRequest();
        request.setAirlineId("EK");
        request.setAirportCode("DXB");
        ServiceConfigurationDTO svc = new ServiceConfigurationDTO();
        svc.setChargeCode("BAGGAGE");
        svc.setFormulaType("PF-01");
        request.setServices(List.of(svc));

        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");

        // Dimensional security passes
        doNothing().when(dimensionalSecurityEvaluator).verifyAccess(eq("DXB"), eq("EK"), anySet());

        ContractResponse response = contractService.createContract(request);

        assertThat(response).isNotNull();
        verify(contractRepository).save(any(Contract.class));
    }

    @Test
    void createContract_withRestrictedAirport_fails() {
        mockSecurityContext("user-1");

        ContractCreateRequest request = new ContractCreateRequest();
        request.setAirlineId("EK");
        request.setAirportCode("LHR"); // restricted airport
        ServiceConfigurationDTO svc = new ServiceConfigurationDTO();
        svc.setChargeCode("BAGGAGE");
        svc.setFormulaType("PF-01");
        request.setServices(List.of(svc));

        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        doThrow(new AccessDeniedException("Restricted"))
                .when(dimensionalSecurityEvaluator).verifyAccess(eq("LHR"), eq("EK"), anySet());

        assertThatThrownBy(() -> contractService.createContract(request))
                .isInstanceOf(AccessDeniedException.class);

        verify(contractRepository, never()).save(any(Contract.class));
    }

    @Test
    void getContracts_filtersOutRestrictedAirports() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        Contract c1 = Contract.builder().id("c1").airportCode("DXB").airlineId("EK").services(new ArrayList<>()).build();
        Contract c2 = Contract.builder().id("c2").airportCode("LHR").airlineId("EK").services(new ArrayList<>()).build();

        when(contractRepository.findByGroundHandlerIdOrderByCreatedAtDesc("SWISSPORT")).thenReturn(List.of(c1, c2));

        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("LHR")).thenReturn(false); // restricted
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);

        List<ContractResponse> result = contractService.getContracts(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("c1");
    }

    @Test
    void getContracts_filtersOutRestrictedAirlines() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        Contract c1 = Contract.builder().id("c1").airportCode("DXB").airlineId("EK").services(new ArrayList<>()).build();
        Contract c2 = Contract.builder().id("c2").airportCode("DXB").airlineId("LH").services(new ArrayList<>()).build();

        when(contractRepository.findByGroundHandlerIdOrderByCreatedAtDesc("SWISSPORT")).thenReturn(List.of(c1, c2));

        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("LH")).thenReturn(false); // restricted

        List<ContractResponse> result = contractService.getContracts(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("c1");
    }

    @Test
    void getContracts_filtersOutRestrictedChargeCodes() {
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");

        ServiceConfiguration s1 = ServiceConfiguration.builder().chargeCode("BAGGAGE").formulaType(FormulaType.PF_01).build();
        ServiceConfiguration s2 = ServiceConfiguration.builder().chargeCode("CATERING").formulaType(FormulaType.PF_01).build();

        Contract c1 = Contract.builder().id("c1").airportCode("DXB").airlineId("EK").services(new ArrayList<>()).build();
        c1.addService(s1);

        Contract c2 = Contract.builder().id("c2").airportCode("DXB").airlineId("EK").services(new ArrayList<>()).build();
        c2.addService(s2);

        when(contractRepository.findByGroundHandlerIdOrderByCreatedAtDesc("SWISSPORT")).thenReturn(List.of(c1, c2));

        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("CATERING")).thenReturn(false); // restricted

        List<ContractResponse> result = contractService.getContracts(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("c1");
    }
}
