package com.airline.repository;

import com.airline.domain.ContractAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractAuditLogRepository extends JpaRepository<ContractAuditLog, String> {
    List<ContractAuditLog> findByContractId(String contractId);
}
