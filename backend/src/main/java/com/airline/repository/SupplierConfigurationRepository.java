package com.airline.repository;

import com.airline.domain.SupplierConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierConfigurationRepository extends JpaRepository<SupplierConfiguration, String> {
}
