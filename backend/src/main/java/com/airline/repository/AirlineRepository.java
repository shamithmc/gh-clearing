package com.airline.repository;

import com.airline.domain.Airline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AirlineRepository extends JpaRepository<Airline, String> {
    List<Airline> findByCountryIgnoreCase(String country);
    List<Airline> findAllByOrderByNameAsc();
}
