package com.airline.repository;

import com.airline.domain.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.airline.domain.ContractStatus;
import java.util.List;

@Repository
public interface ContractRepository extends JpaRepository<Contract, String> {
    List<Contract> findByGroundHandlerId(String groundHandlerId);
    List<Contract> findByGroundHandlerIdAndStatus(String groundHandlerId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusNot(String airlineId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusAndStatusNot(String airlineId, ContractStatus status, ContractStatus excludeStatus);

    List<Contract> findByGroundHandlerIdOrderByCreatedAtDesc(String groundHandlerId);
    List<Contract> findByGroundHandlerIdAndStatusOrderByCreatedAtDesc(String groundHandlerId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusNotOrderByCreatedAtDesc(String airlineId, ContractStatus status);
    List<Contract> findByAirlineIdAndStatusAndStatusNotOrderByCreatedAtDesc(String airlineId, ContractStatus status, ContractStatus excludeStatus);
}
