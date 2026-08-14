package com.airline.repository;

import com.airline.domain.OperationalFlight;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OperationalFlightRepository extends TenantScopedRepository<OperationalFlight, String> {
    Optional<OperationalFlight> findByIdAndSupplierId(String id, String supplierId);

    List<OperationalFlight> findBySupplierIdAndFlightDateBetweenOrderByFlightDateAsc(
            String supplierId, LocalDate startDate, LocalDate endDate);
}
