package com.airline.repository;

import com.airline.domain.Airport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AirportRepository extends JpaRepository<Airport, String> {
    List<Airport> findByRegionIgnoreCase(String region);
    List<Airport> findByCountryIgnoreCase(String country);
    List<Airport> findAllByOrderByIataCodeAsc();
}
