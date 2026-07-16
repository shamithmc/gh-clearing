package com.airline.repository;

import com.airline.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    List<User> findAllByTenantId(String tenantId);
    boolean existsByEmailAndTenantId(String email, String tenantId);
}
