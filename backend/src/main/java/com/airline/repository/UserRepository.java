package com.airline.repository;

import com.airline.domain.User;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserRepository extends TenantScopedRepository<User, String> {
    List<User> findAllByTenantId(String tenantId);
    java.util.Optional<User> findByIdAndTenantId(String id, String tenantId);
    boolean existsByIdAndTenantId(String id, String tenantId);
    boolean existsByEmailAndTenantId(String email, String tenantId);
}
