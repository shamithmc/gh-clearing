package com.airline.contracts;

import com.airline.api.dto.ContractResponse;
import com.airline.domain.Contract;
import com.airline.domain.ContractStatus;
import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.repository.ContractAuditLogRepository;
import com.airline.repository.ContractRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import com.airline.service.ContractService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AirlineContractViewerTest {

    @Mock private ContractRepository contractRepository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensionalSecurityEvaluator;
    @Mock private ContractAuditLogRepository contractAuditLogRepository;

    private ContractService contractService;

    @BeforeEach
    void setUp() {
        contractService = new ContractService(
                contractRepository, tenantContext, dimensionalSecurityEvaluator, contractAuditLogRepository);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void contractViewerSeesOnlyMatchingAirportAndServiceType() {
        authenticate("CONTRACT_VIEWER");
        Contract matching = contract("matching", "DXB", "BAGGAGE");
        Contract wrongAirport = contract("wrong-airport", "FRA", "BAGGAGE");
        Contract wrongService = contract("wrong-service", "DXB", "CATERING");
        when(contractRepository.findByAirlineIdAndStatusNotOrderByCreatedAtDesc("EK", ContractStatus.DRAFT))
                .thenReturn(List.of(matching, wrongAirport, wrongService));
        permitDimensions(matching, wrongAirport, wrongService);

        List<ContractResponse> result = contractService.getContracts(null, " dxb ", "baggage");

        assertThat(result).extracting(ContractResponse::getId).containsExactly("matching");
    }

    @Test
    void contractReviewerCanReadContractsNeededForReview() {
        authenticate("CONTRACT_REVIEWER");
        Contract contract = contract("review", "DXB", "BAGGAGE");
        when(contractRepository.findByAirlineIdAndStatusNotOrderByCreatedAtDesc("EK", ContractStatus.DRAFT))
                .thenReturn(List.of(contract));
        permitDimensions(contract);

        assertThat(contractService.getContracts(null, null, null))
                .extracting(ContractResponse::getId).containsExactly("review");
    }

    @Test
    void airlineUserWithoutContractRoleIsDeniedBeforeRepositoryRead() {
        authenticate("MIS_VIEWER");

        assertThatThrownBy(() -> contractService.getContracts(null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("required roles");
        verify(contractRepository, never())
                .findByAirlineIdAndStatusNotOrderByCreatedAtDesc("EK", ContractStatus.DRAFT);
    }

    @Test
    void draftContractsRemainInvisibleToAirlineViewer() {
        authenticate("CONTRACT_VIEWER");

        assertThat(contractService.getContracts(ContractStatus.DRAFT, null, null)).isEmpty();
        verify(contractRepository, never())
                .findByAirlineIdAndStatusAndStatusNotOrderByCreatedAtDesc(
                        "EK", ContractStatus.DRAFT, ContractStatus.DRAFT);
    }

    @Test
    void dimensionalScopeStillFiltersAirlineContractResults() {
        authenticate("CONTRACT_VIEWER");
        Contract allowed = contract("allowed", "DXB", "BAGGAGE");
        Contract restricted = contract("restricted", "LHR", "BAGGAGE");
        when(contractRepository.findByAirlineIdAndStatusNotOrderByCreatedAtDesc("EK", ContractStatus.DRAFT))
                .thenReturn(List.of(allowed, restricted));
        when(dimensionalSecurityEvaluator.isAirportPermitted("DXB")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isAirportPermitted("LHR")).thenReturn(false);
        when(dimensionalSecurityEvaluator.isAirlinePermitted("EK")).thenReturn(true);
        when(dimensionalSecurityEvaluator.isChargeCodePermitted("BAGGAGE")).thenReturn(true);

        assertThat(contractService.getContracts(null, null, null))
                .extracting(ContractResponse::getId).containsExactly("allowed");
    }

    private void authenticate(String role) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject("airline-user")
                .claim("tenant_id", "EK")
                .claim("tenant_type", "AIRLINE")
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority(role))));
    }

    private Contract contract(String id, String airportCode, String chargeCode) {
        Contract contract = Contract.builder()
                .id(id)
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode(airportCode)
                .status(ContractStatus.APPROVED)
                .currency("USD")
                .services(new ArrayList<>())
                .build();
        contract.addService(ServiceConfiguration.builder()
                .id(id + "-service")
                .chargeCode(chargeCode)
                .serviceName(chargeCode)
                .formulaType(FormulaType.PF_01)
                .build());
        return contract;
    }

    private void permitDimensions(Contract... contracts) {
        for (Contract contract : contracts) {
            when(dimensionalSecurityEvaluator.isAirportPermitted(contract.getAirportCode())).thenReturn(true);
            when(dimensionalSecurityEvaluator.isAirlinePermitted(contract.getAirlineId())).thenReturn(true);
            for (ServiceConfiguration service : contract.getServices()) {
                when(dimensionalSecurityEvaluator.isChargeCodePermitted(service.getChargeCode())).thenReturn(true);
            }
        }
    }
}
