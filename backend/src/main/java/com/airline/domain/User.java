package com.airline.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", insertable = false, updatable = false)
    private Tenant tenant;

    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "roles", nullable = false, length = 255)
    private String rolesRaw;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_airport_restrictions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "airport_code")
    @Builder.Default
    private Set<String> airportRestrictions = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_airline_restrictions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "airline_id")
    @Builder.Default
    private Set<String> airlineRestrictions = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_charge_code_restrictions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "charge_code")
    @Builder.Default
    private Set<String> chargeCodeRestrictions = new HashSet<>();

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    @Transient
    public Set<String> getRoles() {
        if (rolesRaw == null || rolesRaw.isBlank()) return Set.of();
        return Arrays.stream(rolesRaw.split(","))
                .map(String::trim)
                .collect(Collectors.toSet());
    }

    public void setRoles(Set<String> roles) {
        this.rolesRaw = roles == null ? "" : String.join(",", roles);
    }
}
