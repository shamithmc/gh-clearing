package com.airline.repository;

import com.airline.domain.SupplierConfiguration;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Set;
import java.util.Optional;

@Repository
public interface SupplierConfigurationRepository extends TenantScopedRepository<SupplierConfiguration, String> {

    @EntityGraph(attributePaths = {"enabledAirlines", "enabledAirports"})
    Optional<SupplierConfiguration> findByTenantId(String tenantId);

    @Query("""
            select distinct configuration.tenantId
            from SupplierConfiguration configuration
            join configuration.enabledAirports airport
            join configuration.enabledAirlines airline
            where airport = :airportCode and airline = :airlineId
            """)
    Set<String> findEligibleGroundHandlerIds(
            @Param("airportCode") String airportCode,
            @Param("airlineId") String airlineId);
}
