package com.airline.repository;

import com.airline.domain.ChargeCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChargeCodeRepository extends JpaRepository<ChargeCode, String> {
    List<ChargeCode> findAllByOrderByCodeAsc();
}
