package com.airline.service;

import com.airline.api.dto.UserRequest;
import com.airline.domain.Tenant;
import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private TenantContext tenantContext;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, tenantRepository, tenantContext);
        lenient().when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void airlineAdminCanAssignAllSevenOperationalRolesWithinOwnTenant() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));
        Set<String> allAirlineRoles = Set.of(
                "INVOICE_REVIEWER", "INVOICE_DISPUTER", "CONTRACT_VIEWER",
                "CONTRACT_REVIEWER", "RFP_RAISER", "MIS_VIEWER", "PAYMENT_UPDATER");

        User created = userService.createUser("EK", request(allAirlineRoles));

        assertThat(created.getTenantId()).isEqualTo("EK");
        assertThat(created.getRoles()).containsExactlyInAnyOrderElementsOf(allAirlineRoles);
    }

    @Test
    void groundHandlerAdminRetainsOwnTenantUserManagement() {
        authenticate("ADMIN");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantContext.getCurrentTenantType()).thenReturn("GROUND_HANDLER");
        when(tenantRepository.findById("SWISSPORT"))
                .thenReturn(Optional.of(activeTenant("SWISSPORT", Tenant.TenantType.GROUND_HANDLER)));

        User created = userService.createUser("SWISSPORT", request(Set.of("ADMIN", "CONTRACT_ENTRY")));

        assertThat(created.getRoles()).containsExactlyInAnyOrder("ADMIN", "CONTRACT_ENTRY");
    }

    @Test
    void airlineAdminCannotManageAnotherTenant() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("LH")).thenReturn(Optional.of(activeTenant("LH", Tenant.TenantType.AIRLINE)));

        assertThatThrownBy(() -> userService.createUser("LH", request(Set.of("INVOICE_REVIEWER"))))
                .isInstanceOf(AccessDeniedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void airlineAdminCannotAssignForeignOrAdministrativeRole() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));

        assertThatThrownBy(() -> userService.createUser("EK", request(Set.of("CONTRACT_APPROVER"))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported roles");
        assertThatThrownBy(() -> userService.createUser("EK", request(Set.of("AIRLINE_ADMIN"))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported roles");
    }

    @Test
    void platformAdminCanBootstrapAirlineAdmin() {
        authenticate("PLATFORM_ADMIN");
        when(tenantContext.getCurrentTenantType()).thenReturn("PLATFORM_ADMIN");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));

        User created = userService.createUser("EK", request(Set.of("AIRLINE_ADMIN")));

        assertThat(created.getRoles()).containsExactly("AIRLINE_ADMIN");
    }

    @Test
    void duplicateGlobalUserIdFailsWithoutOverwritingAnotherTenant() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));
        when(userRepository.existsByIdAndTenantId("new-user", "EK")).thenReturn(true);

        assertThatThrownBy(() -> userService.createUser("EK", request(Set.of("MIS_VIEWER"))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already exists");
        verify(userRepository, never()).save(any());
    }

    @Test
    void airlineUsersCannotOverrideTheirImplicitAirlineDimension() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));
        UserRequest request = request(Set.of("CONTRACT_VIEWER"));
        request.setAirlineRestrictions(Set.of("LH"));

        assertThatThrownBy(() -> userService.createUser("EK", request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("implicitly restricted");
    }

    @Test
    void airlineAdminCanUpdateUserWithinOwnTenant() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));

        User existing = User.builder()
                .id("u1")
                .tenantId("EK")
                .username("Old Name")
                .email("u1@ek.test")
                .build();
        existing.setRoles(Set.of("INVOICE_REVIEWER"));

        when(userRepository.findByIdAndTenantId("u1", "EK")).thenReturn(Optional.of(existing));

        com.airline.api.dto.UserUpdateRequest updateRequest = new com.airline.api.dto.UserUpdateRequest();
        updateRequest.setUsername("New Name");
        updateRequest.setEmail("u1_updated@ek.test");
        updateRequest.setRoles(Set.of("INVOICE_REVIEWER", "INVOICE_DISPUTER"));
        updateRequest.setAirportRestrictions(Set.of("DXB", "LHR"));
        updateRequest.setChargeCodeRestrictions(Set.of("BAGGAGE"));

        User updated = userService.updateUser("EK", "u1", updateRequest);

        assertThat(updated.getUsername()).isEqualTo("New Name");
        assertThat(updated.getEmail()).isEqualTo("u1_updated@ek.test");
        assertThat(updated.getRoles()).containsExactlyInAnyOrder("INVOICE_REVIEWER", "INVOICE_DISPUTER");
        assertThat(updated.getAirportRestrictions()).containsExactlyInAnyOrder("DXB", "LHR");
        assertThat(updated.getChargeCodeRestrictions()).containsExactlyInAnyOrder("BAGGAGE");
    }

    @Test
    void groundHandlerAdminCannotUpdateOtherTenantUser() {
        authenticate("GROUND_HANDLER_ADMIN");
        when(tenantContext.getCurrentTenantId()).thenReturn("SWISSPORT");
        when(tenantRepository.findById("MENZIES")).thenReturn(Optional.of(activeTenant("MENZIES", Tenant.TenantType.GROUND_HANDLER)));

        com.airline.api.dto.UserUpdateRequest updateRequest = new com.airline.api.dto.UserUpdateRequest();
        updateRequest.setUsername("New Name");
        updateRequest.setEmail("u@menzies.test");
        updateRequest.setRoles(Set.of("CONTRACT_ENTRY"));

        assertThatThrownBy(() -> userService.updateUser("MENZIES", "u1", updateRequest))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateUserEmailConflictFails() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));

        User existing = User.builder()
                .id("u1")
                .tenantId("EK")
                .username("User 1")
                .email("u1@ek.test")
                .build();
        existing.setRoles(Set.of("INVOICE_REVIEWER"));

        when(userRepository.findByIdAndTenantId("u1", "EK")).thenReturn(Optional.of(existing));
        when(userRepository.existsByEmailAndTenantId("taken@ek.test", "EK")).thenReturn(true);

        com.airline.api.dto.UserUpdateRequest updateRequest = new com.airline.api.dto.UserUpdateRequest();
        updateRequest.setUsername("User 1");
        updateRequest.setEmail("taken@ek.test");
        updateRequest.setRoles(Set.of("INVOICE_REVIEWER"));

        assertThatThrownBy(() -> userService.updateUser("EK", "u1", updateRequest))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void updateUserNotFoundThrows404() {
        authenticate("AIRLINE_ADMIN");
        airlineContext("EK");
        when(tenantRepository.findById("EK")).thenReturn(Optional.of(activeTenant("EK", Tenant.TenantType.AIRLINE)));
        when(userRepository.findByIdAndTenantId("unknown", "EK")).thenReturn(Optional.empty());

        com.airline.api.dto.UserUpdateRequest updateRequest = new com.airline.api.dto.UserUpdateRequest();
        updateRequest.setUsername("User");
        updateRequest.setEmail("u@ek.test");
        updateRequest.setRoles(Set.of("INVOICE_REVIEWER"));

        assertThatThrownBy(() -> userService.updateUser("EK", "unknown", updateRequest))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("User not found");
    }

    private void authenticate(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("user", "password", authorities));
    }

    private void airlineContext(String tenantId) {
        when(tenantContext.getCurrentTenantId()).thenReturn(tenantId);
        lenient().when(tenantContext.getCurrentTenantType()).thenReturn("AIRLINE");
    }

    private Tenant activeTenant(String id, Tenant.TenantType type) {
        return Tenant.builder().id(id).name(id).type(type).status(Tenant.TenantStatus.ACTIVE).build();
    }

    private UserRequest request(Set<String> roles) {
        UserRequest request = new UserRequest();
        request.setId("new-user");
        request.setUsername("New User");
        request.setEmail("new.user@example.test");
        request.setRoles(roles);
        request.setAirportRestrictions(Set.of("DXB"));
        request.setChargeCodeRestrictions(Set.of("BAGGAGE"));
        return request;
    }
}
