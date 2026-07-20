package com.airline.repository;

import com.airline.domain.AircraftTypeMtowDefault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AircraftTypeMtowDefaultRepository extends JpaRepository<AircraftTypeMtowDefault, String> {
}
