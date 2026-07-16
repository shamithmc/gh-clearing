package com.airline.repository;

import com.airline.domain.ServiceConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceConfigurationRepository extends JpaRepository<ServiceConfiguration, String> {
}
