package com.airline.repository;

import com.airline.domain.MtowRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MtowRecordRepository extends JpaRepository<MtowRecord, String> {
}
