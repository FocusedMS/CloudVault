package com.bms.repository;

import com.bms.entity.FixedDeposit;
import com.bms.enums.FDStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface FixedDepositRepository extends JpaRepository<FixedDeposit, Long> {
    
    Optional<FixedDeposit> findByFdAccountNumber(String fdAccountNumber);
    
    List<FixedDeposit> findByAccount_AccountNumber(String accountNumber);
    
    List<FixedDeposit> findByAccount_AccountNumberAndStatus(String accountNumber, FDStatus status);
    
    List<FixedDeposit> findByMaturityDateLessThanAndStatus(LocalDateTime currentDate, FDStatus status);
} 