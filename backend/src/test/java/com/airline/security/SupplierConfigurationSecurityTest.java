package com.airline.security;

import com.airline.api.dto.SupplierConfigurationRequest;
import com.airline.domain.SupplierConfiguration;
import com.airline.domain.Tenant;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.repository.TenantRepository;
import com.airline.service.SupplierConfigurationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupplierConfigurationSecurityTest {

    @Mock
    private SupplierConfigurationRepository supplierConfigurationRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private TenantContext tenantContext;

    @InjectMocks
    private SupplierConfigurationService supplierConfigurationService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getConfiguration_forAirlineTenant_throwsBadRequest() {
        Tenant airline = new Tenant();
        airline.setId("air-1");
        airline.setType(Tenant.TenantType.AIRLINE);

        when(tenantRepository.findById("air-1")).thenReturn(Optional.of(airline));

        assertThatThrownBy(() -> supplierConfigurationService.getConfiguration("air-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("only applicable to GROUND_HANDLER");
    }

    @Test
    void getConfiguration_forGroundHandlerTenant_returnsConfig() {
        authenticate("ADMIN");
        Tenant gh = new Tenant();
        gh.setId("gh-1");
        gh.setType(Tenant.TenantType.GROUND_HANDLER);

        SupplierConfiguration config = new SupplierConfiguration();
        config.setTenantId("gh-1");

        when(tenantRepository.findById("gh-1")).thenReturn(Optional.of(gh));
        when(tenantContext.getCurrentTenantId()).thenReturn("gh-1");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(supplierConfigurationRepository.findByTenantId("gh-1")).thenReturn(Optional.of(config));

        SupplierConfiguration result = supplierConfigurationService.getConfiguration("gh-1");
        assertThat(result.getTenantId()).isEqualTo("gh-1");
    }

    @Test
    void updateConfiguration_forAnotherGroundHandlerTenant_isDenied() {
        authenticate("GROUND_HANDLER_ADMIN");
        when(tenantRepository.findById("gh-2"))
                .thenReturn(Optional.of(tenant("gh-2", Tenant.TenantType.GROUND_HANDLER)));
        when(tenantContext.getCurrentTenantId()).thenReturn("gh-1");

        assertThatThrownBy(() -> supplierConfigurationService.updateConfiguration(
                "gh-2", new SupplierConfigurationRequest()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only their own tenant");
        verify(supplierConfigurationRepository, never()).save(any());
    }

    @Test
    void platformAdminCanReadGroundHandlerConfiguration() {
        authenticate("PLATFORM_ADMIN");
        SupplierConfiguration config = SupplierConfiguration.builder().tenantId("gh-2").build();
        when(tenantRepository.findById("gh-2"))
                .thenReturn(Optional.of(tenant("gh-2", Tenant.TenantType.GROUND_HANDLER)));
        when(tenantContext.getCurrentTenantType()).thenReturn("PLATFORM_ADMIN");
        when(supplierConfigurationRepository.findByTenantId("gh-2")).thenReturn(Optional.of(config));

        assertThat(supplierConfigurationService.getConfiguration("gh-2").getTenantId()).isEqualTo("gh-2");
    }

    private void authenticate(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("user", "password", authorities));
    }

    private Tenant tenant(String id, Tenant.TenantType type) {
        return Tenant.builder().id(id).name(id).type(type).status(Tenant.TenantStatus.ACTIVE).build();
    }
}
