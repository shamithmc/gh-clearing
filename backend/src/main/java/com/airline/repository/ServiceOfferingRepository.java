package com.airline.repository;

import com.airline.domain.ServiceOffering;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, String> {

    List<ServiceOffering> findAllByTenantIdOrderByAirportCodeAscServiceTypeAsc(String tenantId);

    Optional<ServiceOffering> findByIdAndTenantId(String id, String tenantId);

    boolean existsByTenantIdAndAirportCodeAndServiceType(
            String tenantId, String airportCode, String serviceType);

    @Query(value = """
            select distinct offering.*
            from service_offerings offering
            join supplier_enabled_airports airport
              on airport.tenant_id = offering.tenant_id
             and airport.airport_code = offering.airport_code
            join supplier_enabled_airlines airline
              on airline.tenant_id = offering.tenant_id
            where airline.airline_id = :airlineId
            order by offering.airport_code, offering.service_type, offering.tenant_id
            """, nativeQuery = true)
    List<ServiceOffering> findMarketplaceOfferings(@Param("airlineId") String airlineId);
}
