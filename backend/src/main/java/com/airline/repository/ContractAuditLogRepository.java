package com.airline.repository;

import com.airline.domain.ContractAuditLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractAuditLogRepository extends TenantScopedRepository<ContractAuditLog, String> {

    @Query("""
            select log from ContractAuditLog log
            where log.contractId = :contractId
              and exists (
                  select contract.id from Contract contract
                  where contract.id = log.contractId
                    and (contract.groundHandlerId = :tenantId or contract.airlineId = :tenantId)
              )
            """)
    List<ContractAuditLog> findByContractIdForTenant(
            @Param("contractId") String contractId,
            @Param("tenantId") String tenantId);
}
