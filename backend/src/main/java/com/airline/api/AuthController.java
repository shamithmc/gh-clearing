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
    private final String issuerUri;
    private final String clientId;

    public AuthController(
            AuthenticatedUserProvisioningService provisioningService,
            @Value("${app.auth.keycloak.enabled:false}") boolean browserAuthEnabled,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String issuerUri,
            @Value("${app.auth.keycloak.client-id:}") String clientId) {
        this.provisioningService = provisioningService;
        this.browserAuthEnabled = browserAuthEnabled;
        this.issuerUri = issuerUri;
        this.clientId = clientId;
    }

    @GetMapping("/config")
    public BrowserAuthConfigResponse config() {
        boolean enabled = browserAuthEnabled && !issuerUri.isBlank() && !clientId.isBlank();
        return new BrowserAuthConfigResponse(enabled, enabled ? issuerUri : "", enabled ? clientId : "");
    }

    @PostMapping("/session")
    public ResponseEntity<AuthenticatedUserResponse> session(JwtAuthenticationToken authentication) {
        return ResponseEntity.ok(provisioningService.provision(authentication));
    }
}
