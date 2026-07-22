package com.airline.repository;

import com.airline.domain.Rfp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RfpRepository extends JpaRepository<Rfp, String> {
    List<Rfp> findAllByTenantIdOrderByCreatedAtDesc(String tenantId);
}
