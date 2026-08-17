package com.airline.service;

import com.airline.api.dto.TenantRequest;
import com.airline.domain.Tenant;
import com.airline.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantServiceTest {

    @Mock private TenantRepository tenantRepository;

    private TenantService tenantService;

    @BeforeEach
    void setUp() {
        tenantService = new TenantService(tenantRepository);
    }

    @Test
    void createsTenantSuccessfully() {
        TenantRequest request = new TenantRequest();
        request.setId("LH");
        request.setName("Lufthansa");
        request.setType(Tenant.TenantType.AIRLINE);

        when(tenantRepository.existsById("LH")).thenReturn(false);
        when(tenantRepository.existsByNameIgnoreCase("Lufthansa")).thenReturn(false);
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(i -> i.getArgument(0));

        Tenant created = tenantService.createTenant(request);

        assertThat(created.getId()).isEqualTo("LH");
        assertThat(created.getName()).isEqualTo("Lufthansa");
        assertThat(created.getType()).isEqualTo(Tenant.TenantType.AIRLINE);
        assertThat(created.getStatus()).isEqualTo(Tenant.TenantStatus.ACTIVE);
    }

    @Test
    void rejectsDuplicateTenantId() {
        TenantRequest request = new TenantRequest();
        request.setId("EK");
        request.setName("Emirates Alternative");
        request.setType(Tenant.TenantType.AIRLINE);

        when(tenantRepository.existsById("EK")).thenReturn(true);

        assertThatThrownBy(() -> tenantService.createTenant(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already exists");
        verify(tenantRepository, never()).save(any());
    }

    @Test
    void rejectsDuplicateTenantName() {
        TenantRequest request = new TenantRequest();
        request.setId("EK2");
        request.setName("Emirates");
        request.setType(Tenant.TenantType.AIRLINE);

        when(tenantRepository.existsById("EK2")).thenReturn(false);
        when(tenantRepository.existsByNameIgnoreCase("Emirates")).thenReturn(true);

        assertThatThrownBy(() -> tenantService.createTenant(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already exists");
        verify(tenantRepository, never()).save(any());
    }

    @Test
    void listsAndGetsTenants() {
        Tenant tenant = Tenant.builder().id("EK").name("Emirates").type(Tenant.TenantType.AIRLINE).status(Tenant.TenantStatus.ACTIVE).build();
        when(tenantRepository.findAll()).thenReturn(List.of(tenant));
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(tenant));

        assertThat(tenantService.listTenants()).containsExactly(tenant);
        assertThat(tenantService.getTenant("EK")).isSameAs(tenant);
    }

    @Test
    void getTenantNotFoundThrowsException() {
        when(tenantRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tenantService.getTenant("UNKNOWN"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Tenant not found");
    }
}
