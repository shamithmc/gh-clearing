package com.airline.repository;

import com.airline.domain.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.airline.domain.ContractStatus;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, String> {
    List<Contract> findByGroundHandlerId(String groundHandlerId);
    List<Contract> findByAirlineId(String airlineId);
    List<Contract> findByGroundHandlerIdAndStatus(String groundHandlerId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusNot(String airlineId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusAndStatusNot(String airlineId, ContractStatus status, ContractStatus excludeStatus);

    List<Contract> findByGroundHandlerIdOrderByCreatedAtDesc(String groundHandlerId);
    List<Contract> findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(String groundHandlerId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusOrderByCreatedAtDesc(String airlineId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusNotOrderByCreatedAtDesc(String airlineId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusAndStatusNotOrderByCreatedAtDesc(String airlineId, ContractStatus status, ContractStatus excludeStatus);

    @Query("SELECT c FROM Contract c WHERE c.id = :id AND (c.groundHandlerId = :tenantId OR c.airlineId = :tenantId)")
    Optional<Contract> findByIdAndTenantId(@Param("id") String id, @Param("tenantId") String tenantId);
}
