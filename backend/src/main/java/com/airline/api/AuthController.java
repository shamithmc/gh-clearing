package com.airline.api;

import com.airline.api.dto.AuthenticatedUserResponse;
import com.airline.api.dto.BrowserAuthConfigResponse;
import com.airline.service.AuthenticatedUserProvisioningService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticatedUserProvisioningService provisioningService;
    private final boolean browserAuthEnabled;
    private final String apiHostname;
    private final String clientId;

    public AuthController(
            AuthenticatedUserProvisioningService provisioningService,
            @Value("${app.auth.workos.enabled:false}") boolean browserAuthEnabled,
            @Value("${app.auth.workos.api-hostname:api.workos.com}") String apiHostname,
            @Value("${app.auth.workos.client-id:}") String clientId) {
        this.provisioningService = provisioningService;
        this.browserAuthEnabled = browserAuthEnabled;
        this.apiHostname = apiHostname;
        this.clientId = clientId;
    }

    @GetMapping("/config")
    public BrowserAuthConfigResponse config() {
        boolean enabled = browserAuthEnabled && !apiHostname.isBlank() && !clientId.isBlank();
        return new BrowserAuthConfigResponse(enabled, enabled ? apiHostname : "", enabled ? clientId : "");
    }

    @PostMapping("/session")
    public ResponseEntity<AuthenticatedUserResponse> session(JwtAuthenticationToken authentication) {
        return ResponseEntity.ok(provisioningService.provision(authentication));
    }
}
