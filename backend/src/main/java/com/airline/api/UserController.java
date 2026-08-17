package com.airline.api;

import com.airline.api.dto.UserRequest;
import com.airline.api.dto.UserResponse;
import com.airline.api.dto.UserUpdateRequest;
import com.airline.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/tenants/{tenantId}/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'ADMIN', 'GROUND_HANDLER_ADMIN', 'AIRLINE_ADMIN')")
    public ResponseEntity<UserResponse> createUser(
            @PathVariable String tenantId,
            @Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserResponse.from(userService.createUser(tenantId, request)));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'ADMIN', 'GROUND_HANDLER_ADMIN', 'AIRLINE_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String tenantId,
            @PathVariable String userId,
            @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(UserResponse.from(userService.updateUser(tenantId, userId, request)));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'ADMIN', 'GROUND_HANDLER_ADMIN', 'AIRLINE_ADMIN')")
    public ResponseEntity<List<UserResponse>> listUsers(@PathVariable String tenantId) {
        return ResponseEntity.ok(
                userService.listUsers(tenantId).stream()
                        .map(UserResponse::from)
                        .toList()
        );
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyAuthority('PLATFORM_ADMIN', 'ADMIN', 'GROUND_HANDLER_ADMIN', 'AIRLINE_ADMIN')")
    public ResponseEntity<UserResponse> getUser(
            @PathVariable String tenantId,
            @PathVariable String userId) {
        return ResponseEntity.ok(UserResponse.from(userService.getUser(tenantId, userId)));
    }
}
