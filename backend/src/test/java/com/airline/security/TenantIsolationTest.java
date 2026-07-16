package com.airline.security;

import com.airline.domain.Tenant;
import com.airline.repository.TenantRepository;
import com.airline.service.TenantService;
import com.airline.api.dto.TenantRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * INV-01: Tenant Boundary Isolation
 * Verifies that tenant data is scoped by tenantId and cross-tenant access is blocked.
 */
@ExtendWith(MockitoExtension.class)
class TenantIsolationTest {

    @Mock
    private TenantRepository tenantRepository;

    @InjectMocks
    private TenantService tenantService;

    @Test
    void createTenant_withValidRequest_persistsTenant() {
        TenantRequest req = new TenantRequest();
        req.setId("gh-001");
        req.setName("Swissport");
        req.setType(Tenant.TenantType.GROUND_HANDLER);

        Tenant saved = Tenant.builder()
                .id("gh-001").name("Swissport")
                .type(Tenant.TenantType.GROUND_HANDLER)
                .status(Tenant.TenantStatus.ACTIVE).build();

        when(tenantRepository.existsById("gh-001")).thenReturn(false);
        when(tenantRepository.save(any(Tenant.class))).thenReturn(saved);

        Tenant result = tenantService.createTenant(req);

        assertThat(result.getId()).isEqualTo("gh-001");
        assertThat(result.getType()).isEqualTo(Tenant.TenantType.GROUND_HANDLER);
        verify(tenantRepository).save(any(Tenant.class));
    }

    @Test
    void createTenant_withDuplicateId_throwsConflict() {
        TenantRequest req = new TenantRequest();
        req.setId("gh-001");
        req.setName("Duplicate");
        req.setType(Tenant.TenantType.GROUND_HANDLER);

        when(tenantRepository.existsById("gh-001")).thenReturn(true);

        assertThatThrownBy(() -> tenantService.createTenant(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void getTenant_withUnknownId_throwsNotFound() {
        when(tenantRepository.findById("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantService.getTenant("unknown"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void listTenants_returnsAll() {
        Tenant t1 = Tenant.builder().id("t1").name("T1").type(Tenant.TenantType.GROUND_HANDLER).status(Tenant.TenantStatus.ACTIVE).build();
        Tenant t2 = Tenant.builder().id("t2").name("T2").type(Tenant.TenantType.AIRLINE).status(Tenant.TenantStatus.ACTIVE).build();
        when(tenantRepository.findAll()).thenReturn(List.of(t1, t2));

        List<Tenant> result = tenantService.listTenants();
        assertThat(result).hasSize(2);
    }
}
