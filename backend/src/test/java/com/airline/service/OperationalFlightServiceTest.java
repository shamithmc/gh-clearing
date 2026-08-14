package com.airline.service;

import com.airline.api.dto.OperationalFlightRequest;
import com.airline.repository.OperationalFlightRepository;
import com.airline.security.DimensionalSecurityEvaluator;
import com.airline.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OperationalFlightServiceTest {
    @Mock private OperationalFlightRepository repository;
    @Mock private TenantContext tenantContext;
    @Mock private DimensionalSecurityEvaluator dimensions;
    private OperationalFlightService service;

    @BeforeEach
    void setUp() {
        service = new OperationalFlightService(repository, tenantContext, dimensions);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("entry-user", "n/a", "INVOICE_ENTRY"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordsNormalizedFlightForCurrentSupplierAfterDimensionCheck() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantContext.getCurrentTenantId()).thenReturn("SUPPLIER");
        when(repository.findByIdAndSupplierId("flight-1", "SUPPLIER")).thenReturn(Optional.empty());
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(call -> call.getArgument(0));

        var saved = service.record(request());

        assertThat(saved.getSupplierId()).isEqualTo("SUPPLIER");
        assertThat(saved.getAirlineId()).isEqualTo("EK");
        assertThat(saved.getAirportCode()).isEqualTo("DXB");
        assertThat(saved.getTailId()).isEqualTo("A6-EQA");
        verify(dimensions).verifyAccess("DXB", "EK", Set.of());
    }

    @Test
    void deniesMissingInvoiceEntryBeforeRepositoryWrite() {
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("viewer", "n/a", "MIS_VIEWER"));

        assertThatThrownBy(() -> service.record(request()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("INVOICE_ENTRY");
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private OperationalFlightRequest request() {
        OperationalFlightRequest request = new OperationalFlightRequest();
        request.setId("flight-1");
        request.setAirlineId(" ek ");
        request.setAirportCode(" dxb ");
        request.setFlightNumber(" ek651 ");
        request.setFlightDate(LocalDate.of(2026, 8, 13));
        request.setTailId(" a6-eqa ");
        request.setAircraftType(" a380 ");
        request.setDepartureAirport(" dxb ");
        request.setDestinationAirport(" fra ");
        request.setQuantityDrivers(Map.of("events", 2));
        return request;
    }
}
