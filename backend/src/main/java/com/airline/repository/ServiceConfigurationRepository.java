package com.airline.repository;

import com.airline.domain.ServiceConfiguration;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceConfigurationRepository extends TenantScopedRepository<ServiceConfiguration, String> {
}
