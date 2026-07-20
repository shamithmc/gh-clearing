package com.airline.service;

import com.airline.api.dto.UserRequest;
import com.airline.domain.User;
import com.airline.repository.TenantRepository;
import com.airline.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    public User createUser(String tenantId, UserRequest request) {
        // Enforce tenant existence (INV-01: no orphaned records)
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Tenant not found: " + tenantId);
        }
        if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "User with email '" + request.getEmail() + "' already exists in this tenant");
        }
        User user = User.builder()
                .id(request.getId())
                .tenantId(tenantId)
                .username(request.getUsername())
                .email(request.getEmail())
                .airportRestrictions(request.getAirportRestrictions() != null ? new java.util.HashSet<>(request.getAirportRestrictions()) : new java.util.HashSet<>())
                .airlineRestrictions(request.getAirlineRestrictions() != null ? new java.util.HashSet<>(request.getAirlineRestrictions()) : new java.util.HashSet<>())
                .chargeCodeRestrictions(request.getChargeCodeRestrictions() != null ? new java.util.HashSet<>(request.getChargeCodeRestrictions()) : new java.util.HashSet<>())
                .build();
        user.setRoles(request.getRoles());
        return userRepository.save(user);
    }

    public List<User> listUsers(String tenantId) {
        // Enforce tenant scope on every query (INV-01)
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Tenant not found: " + tenantId);
        }
        return userRepository.findAllByTenantId(tenantId);
    }

    public User getUser(String tenantId, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found: " + userId));
        // Enforce cross-tenant access prevention (INV-01)
        if (!user.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "User does not belong to tenant: " + tenantId);
        }
        return user;
    }
}
