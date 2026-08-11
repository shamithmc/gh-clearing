package com.airline.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Collection;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<com.airline.security.DevAuthFilter> devAuthFilterProvider,
            JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/auth/config").permitAll()
                .requestMatchers(
                    "/", "/index.html", "/assets/**", "/favicon.ico", "/error",
                    "/actuator/health",
                    "/airline/**", "/invoices/**", "/contracts/**", "/rfps/**",
                    "/offerings/**", "/review-requests/**", "/disputes/**", "/configuration/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
            );

        com.airline.security.DevAuthFilter devAuthFilter = devAuthFilterProvider.getIfAvailable();
        if (devAuthFilter != null) {
            http.addFilterBefore(devAuthFilter,
                    org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class);
        }
        return http.build();
    }

    @Bean
    @Profile({"dev", "e2e"})
    public FilterRegistrationBean<com.airline.security.DevAuthFilter> devAuthFilterRegistration(
            com.airline.security.DevAuthFilter devAuthFilter) {
        FilterRegistrationBean<com.airline.security.DevAuthFilter> registration =
                new FilterRegistrationBean<>(devAuthFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
            @Value("${app.auth.workos.client-id:${WORKOS_CLIENT_ID:client_unconfigured}}") String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerUri),
                new com.airline.security.WorkOsClientIdValidator(clientId)));
        return decoder;
    }

    /** Maps signed WorkOS organization roles into the closed application vocabulary. */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> extractRoles(jwt.getClaims()).stream()
                .map(SimpleGrantedAuthority::new)
                .map(a -> (org.springframework.security.core.GrantedAuthority) a)
                .toList());
        return converter;
    }

    static Set<String> extractRoles(Map<String, Object> claims) {
        LinkedHashSet<String> roles = new LinkedHashSet<>();
        addRoles(roles, claims.get("role"));
        addRoles(roles, claims.get("roles"));
        return roles;
    }

    private static void addRoles(Set<String> destination, Object claim) {
        if (claim instanceof Collection<?> values) {
            values.stream().map(Object::toString).map(SecurityConfig::normalizeRole)
                    .filter(value -> !value.isBlank()).forEach(destination::add);
        } else if (claim != null) {
            String role = normalizeRole(claim.toString());
            if (!role.isBlank()) {
                destination.add(role);
            }
        }
    }

    private static String normalizeRole(String role) {
        return role.trim().toUpperCase(java.util.Locale.ROOT).replace('-', '_');
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
