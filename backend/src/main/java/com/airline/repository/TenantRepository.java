package com.airline.repository;

import com.airline.domain.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {
    List<Tenant> findAllByStatus(Tenant.TenantStatus status);
    List<Tenant> findAllByType(Tenant.TenantType type);
    boolean existsByNameIgnoreCase(String name);
}
