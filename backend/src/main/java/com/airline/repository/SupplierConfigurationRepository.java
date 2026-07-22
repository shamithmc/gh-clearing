package com.airline.repository;

import com.airline.domain.SupplierConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Set;

@Repository
public interface SupplierConfigurationRepository extends JpaRepository<SupplierConfiguration, String> {

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
