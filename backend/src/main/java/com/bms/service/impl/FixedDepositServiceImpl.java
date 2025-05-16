package com.bms.service.impl;

import com.bms.dto.FDCreationRequest;
import com.bms.dto.FDCreationResponse;
import com.bms.dto.FDDetailsResponse;
import com.bms.entity.Account;
import com.bms.entity.FixedDeposit;
import com.bms.enums.FDStatus;
import com.bms.exception.InsufficientFundsException;
import com.bms.exception.ResourceNotFoundException;
import com.bms.exception.ValidationException;
import com.bms.repository.AccountRepository;
import com.bms.repository.FixedDepositRepository;
import com.bms.service.FixedDepositService;
import com.bms.util.FDNumberGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FixedDepositServiceImpl implements FixedDepositService {

    private static final Logger logger = LoggerFactory.getLogger(FixedDepositServiceImpl.class);

    @Autowired
    private FixedDepositRepository fdRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FDNumberGenerator fdNumberGenerator;

    private static final BigDecimal MIN_FD_AMOUNT = new BigDecimal("500.00");
    private static final BigDecimal MAX_FD_AMOUNT = new BigDecimal("10000000.00"); // 1 Crore
    private static final BigDecimal INTEREST_RATE = new BigDecimal("6.5"); // 6.5% annual interest
    private static final int MIN_TERM_MONTHS = 6;
    private static final int MAX_TERM_MONTHS = 120; // 10 years
    private static final int MAX_ACTIVE_FDS = 5; // Maximum number of active FDs per account

    @Override
    @Transactional
    public FDCreationResponse createFD(FDCreationRequest request) {
        logger.info("Creating FD for account: {}, amount: {}, term: {} months", 
            request.getAccountNumber(), request.getPrincipalAmount(), request.getTermMonths());

        try {
            // Validate account
            Account account = validateAndGetAccount(request.getAccountNumber());
            logger.info("Account found with balance: {}", account.getBalance());

            // Validate amount
            validateAmount(request.getPrincipalAmount());
            
            // Validate term
            validateTerm(request.getTermMonths());
            
            // Validate number of active FDs
            validateActiveFDCount(account);
            
            // Validate balance
            validateBalance(account.getBalance(), request.getPrincipalAmount());

            // Create FD
            FixedDeposit fd = new FixedDeposit();
            String fdNumber = fdNumberGenerator.generateFDNumber();
            logger.info("Generated FD number: {}", fdNumber);
            fd.setFdAccountNumber(fdNumber);
            fd.setAccount(account);
            fd.setPrincipalAmount(request.getPrincipalAmount());
            fd.setInterestRate(INTEREST_RATE);
            fd.setTermMonths(request.getTermMonths());
            fd.setMaturityDate(LocalDateTime.now().plusMonths(request.getTermMonths()));

            // Deduct amount from account
            account.setBalance(account.getBalance().subtract(request.getPrincipalAmount()));
            accountRepository.save(account);
            logger.info("Updated account balance: {}", account.getBalance());

            // Save FD
            fd = fdRepository.save(fd);
            logger.info("Fixed Deposit created with ID: {}", fd.getId());

            // Calculate expected maturity amount
            BigDecimal expectedMaturityAmount = calculateMaturityAmount(
                request.getPrincipalAmount(),
                INTEREST_RATE,
                request.getTermMonths()
            );
            logger.info("Expected maturity amount: {}", expectedMaturityAmount);

            // Prepare response
            FDCreationResponse.FDDetails details = new FDCreationResponse.FDDetails();
            details.setFdAccountNumber(fd.getFdAccountNumber());
            details.setPrincipalAmount(fd.getPrincipalAmount());
            details.setInterestRate(fd.getInterestRate());
            details.setTermMonths(fd.getTermMonths());
            details.setMaturityDate(fd.getMaturityDate());
            details.setExpectedMaturityAmount(expectedMaturityAmount);

            return new FDCreationResponse("Fixed Deposit created successfully", details);
        } catch (Exception e) {
            logger.error("Error creating Fixed Deposit: {}", e.getMessage(), e);
            throw e;
        }
    }

    private Account validateAndGetAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new ValidationException("INVALID_ACCOUNT", "Account number is required");
        }
        
        return accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new ValidationException("INVALID_AMOUNT", "Principal amount is required");
        }
        
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("INVALID_AMOUNT", "Principal amount must be greater than zero");
        }
        
        if (amount.compareTo(MIN_FD_AMOUNT) < 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("minimumAmount", MIN_FD_AMOUNT);
            details.put("providedAmount", amount);
            throw new ValidationException(
                "BELOW_MINIMUM_AMOUNT",
                "Fixed Deposit amount must be at least ₹" + MIN_FD_AMOUNT,
                details
            );
        }
        
        if (amount.compareTo(MAX_FD_AMOUNT) > 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("maximumAmount", MAX_FD_AMOUNT);
            details.put("providedAmount", amount);
            throw new ValidationException(
                "EXCEEDS_MAXIMUM_AMOUNT",
                "Fixed Deposit amount cannot exceed ₹" + MAX_FD_AMOUNT,
                details
            );
        }
    }

    private void validateTerm(Integer termMonths) {
        if (termMonths == null) {
            throw new ValidationException("INVALID_TERM", "Term period is required");
        }
        
        if (termMonths < MIN_TERM_MONTHS) {
            Map<String, Object> details = new HashMap<>();
            details.put("minimumTerm", MIN_TERM_MONTHS);
            details.put("providedTerm", termMonths);
            throw new ValidationException(
                "BELOW_MINIMUM_TERM",
                "Fixed Deposit term must be at least " + MIN_TERM_MONTHS + " months",
                details
            );
        }
        
        if (termMonths > MAX_TERM_MONTHS) {
            Map<String, Object> details = new HashMap<>();
            details.put("maximumTerm", MAX_TERM_MONTHS);
            details.put("providedTerm", termMonths);
            throw new ValidationException(
                "EXCEEDS_MAXIMUM_TERM",
                "Fixed Deposit term cannot exceed " + MAX_TERM_MONTHS + " months",
                details
            );
        }
    }

    private void validateActiveFDCount(Account account) {
        long activeFDCount = fdRepository.findByAccount_AccountNumberAndStatus(
            account.getAccountNumber(), 
            FDStatus.ACTIVE
        ).size();
        
        if (activeFDCount >= MAX_ACTIVE_FDS) {
            Map<String, Object> details = new HashMap<>();
            details.put("maxAllowedFDs", MAX_ACTIVE_FDS);
            details.put("currentActiveFDs", activeFDCount);
            throw new ValidationException(
                "MAX_FD_LIMIT_REACHED",
                "Cannot create more than " + MAX_ACTIVE_FDS + " active Fixed Deposits",
                details
            );
        }
    }

    private void validateBalance(BigDecimal currentBalance, BigDecimal fdAmount) {
        if (currentBalance.compareTo(fdAmount) < 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("currentBalance", currentBalance);
            details.put("requiredAmount", fdAmount);
            details.put("shortfall", fdAmount.subtract(currentBalance));
            
            throw new InsufficientFundsException(
                String.format("Insufficient funds. Available balance: ₹%s, Required amount: ₹%s",
                    currentBalance, fdAmount)
            );
        }
    }

    @Override
    public List<FDDetailsResponse> getFDsByAccount(String accountNumber) {
        List<FixedDeposit> fds = fdRepository.findByAccount_AccountNumber(accountNumber);
        return fds.stream()
                .map(this::convertToFDDetailsResponse)
                .collect(Collectors.toList());
    }

    @Override
    public FDDetailsResponse getFDDetails(String fdAccountNumber) {
        FixedDeposit fd = fdRepository.findByFdAccountNumber(fdAccountNumber)
                .orElseThrow(() -> new RuntimeException("Fixed Deposit not found"));
        return convertToFDDetailsResponse(fd);
    }

    @Override
    @Scheduled(cron = "0 0 0 * * ?") // Run daily at midnight
    @Transactional
    public void processMaturedFDs() {
        LocalDateTime now = LocalDateTime.now();
        List<FixedDeposit> maturedFDs = fdRepository.findByMaturityDateLessThanAndStatus(now, FDStatus.ACTIVE);

        for (FixedDeposit fd : maturedFDs) {
            // Calculate final interest
            BigDecimal interestEarned = calculateInterest(
                fd.getPrincipalAmount(),
                fd.getInterestRate(),
                fd.getTermMonths()
            );
            fd.setInterestEarned(interestEarned);
            fd.setStatus(FDStatus.MATURED);

            // Add maturity amount to account
            Account account = fd.getAccount();
            BigDecimal maturityAmount = fd.getPrincipalAmount().add(interestEarned);
            account.setBalance(account.getBalance().add(maturityAmount));
            accountRepository.save(account);

            fdRepository.save(fd);
        }
    }

    private FDDetailsResponse convertToFDDetailsResponse(FixedDeposit fd) {
        FDDetailsResponse response = new FDDetailsResponse();
        response.setFdAccountNumber(fd.getFdAccountNumber());
        response.setPrincipalAmount(fd.getPrincipalAmount());
        response.setInterestRate(fd.getInterestRate());
        response.setTermMonths(fd.getTermMonths());
        response.setMaturityDate(fd.getMaturityDate());
        response.setInterestEarned(fd.getInterestEarned());
        response.setStatus(fd.getStatus());
        response.setCreatedAt(fd.getCreatedAt());
        return response;
    }

    private BigDecimal calculateMaturityAmount(BigDecimal principal, BigDecimal rate, int months) {
        BigDecimal interest = calculateInterest(principal, rate, months);
        return principal.add(interest);
    }

    private BigDecimal calculateInterest(BigDecimal principal, BigDecimal rate, int months) {
        // Simple interest calculation: P * R * T
        // P = Principal, R = Rate per annum, T = Time in years
        BigDecimal timeInYears = new BigDecimal(months).divide(new BigDecimal("12"), 4, RoundingMode.HALF_UP);
        return principal.multiply(rate)
                .multiply(timeInYears)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }
} 