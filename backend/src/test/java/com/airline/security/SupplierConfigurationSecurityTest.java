package com.airline.security;

import com.airline.api.dto.SupplierConfigurationRequest;
import com.airline.domain.SupplierConfiguration;
import com.airline.domain.Tenant;
import com.airline.repository.SupplierConfigurationRepository;
import com.airline.repository.TenantRepository;
import com.airline.service.SupplierConfigurationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

    @InjectMocks
    private SupplierConfigurationService supplierConfigurationService;

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
        Tenant gh = new Tenant();
        gh.setId("gh-1");
        gh.setType(Tenant.TenantType.GROUND_HANDLER);

        SupplierConfiguration config = new SupplierConfiguration();
        config.setTenantId("gh-1");

        when(tenantRepository.findById("gh-1")).thenReturn(Optional.of(gh));
        when(supplierConfigurationRepository.findById("gh-1")).thenReturn(Optional.of(config));

        SupplierConfiguration result = supplierConfigurationService.getConfiguration("gh-1");
        assertThat(result.getTenantId()).isEqualTo("gh-1");
    }
}
