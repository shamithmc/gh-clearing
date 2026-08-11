package com.airline.api;

import com.airline.api.dto.BrowserAuthConfigResponse;
import com.airline.service.AuthenticatedUserProvisioningService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AuthControllerTest {

    private final AuthenticatedUserProvisioningService provisioningService =
            mock(AuthenticatedUserProvisioningService.class);

    @Test
    void exposesPublicWorkOsBrowserConfigurationWhenFullyConfigured() {
        AuthController controller = new AuthController(
                provisioningService, true, "api.workos.com", "client_test");

        assertThat(controller.config()).isEqualTo(
                new BrowserAuthConfigResponse(true, "api.workos.com", "client_test"));
    }

    @Test
    void disablesBrowserAuthenticationAndRedactsPartialConfiguration() {
        AuthController controller = new AuthController(
                provisioningService, true, "api.workos.com", "");

        assertThat(controller.config()).isEqualTo(
                new BrowserAuthConfigResponse(false, "", ""));
    }
}
