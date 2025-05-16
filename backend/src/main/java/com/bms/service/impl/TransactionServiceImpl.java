package com.bms.service.impl;

import com.bms.dto.TransactionRequest;
import com.bms.dto.TransactionResponse;
import com.bms.entity.Transaction;
import com.bms.exception.InsufficientFundsException;
import com.bms.exception.ResourceNotFoundException;
import com.bms.exception.ValidationException;
import com.bms.repository.TransactionRepository;
import com.bms.service.AccountService;
import com.bms.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.Comparator;

@Service
public class TransactionServiceImpl implements TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AccountService accountService;

    private static final BigDecimal MAX_TRANSFER_AMOUNT = new BigDecimal("100000.00");
    private static final BigDecimal MIN_TRANSFER_AMOUNT = new BigDecimal("1.00");

    @Override
    @Transactional
    public TransactionResponse processTransaction(TransactionRequest request) {
        try {
            // Set source account number from authenticated user if not provided
            if (request.getSourceAccountNumber() == null || request.getSourceAccountNumber().isBlank()) {
                String loggedInAccountNumber = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                request.setSourceAccountNumber(loggedInAccountNumber);
            }
            
            // Validate amount
            validateAmount(request.getAmount());
            
            // Validate accounts
            validateAccounts(request.getSourceAccountNumber(), request.getDestinationAccountNumber());
            
            // Validate source account balance
            BigDecimal sourceBalance = accountService.getAccountBalance(request.getSourceAccountNumber());
            validateBalance(sourceBalance, request.getAmount());

            // Generate unique transaction ID
            String transactionId = "TXN" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            
            try {
                // Update account balances
                accountService.updateBalance(request.getSourceAccountNumber(), request.getAmount().negate());
                accountService.updateBalance(request.getDestinationAccountNumber(), request.getAmount());
                
                // Create transaction entity
                Transaction transaction = new Transaction();
                transaction.setTransactionId(transactionId);
                transaction.setSourceAccountNumber(request.getSourceAccountNumber());
                transaction.setDestinationAccountNumber(request.getDestinationAccountNumber());
                transaction.setAmount(request.getAmount());
                transaction.setDescription(validateAndTrimDescription(request.getDescription()));
                transaction.setStatus("COMPLETED");
                transaction.setSourceAccountBalance(sourceBalance.subtract(request.getAmount()));
                transaction.setTimestamp(LocalDateTime.now());
                
                // Save transaction
                transaction = transactionRepository.save(transaction);
                
                // Convert to response
                TransactionResponse response = convertToResponse(transaction);
                response.setTransactionType("DEBIT"); // Set type for source account
                return response;
                
            } catch (Exception e) {
                throw new RuntimeException("Transaction failed: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            throw new RuntimeException("Transaction failed: " + e.getMessage(), e);
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new ValidationException("INVALID_AMOUNT", "Transfer amount is required");
        }
        
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("INVALID_AMOUNT", "Transfer amount must be greater than zero");
        }
        
        if (amount.compareTo(MIN_TRANSFER_AMOUNT) < 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("minimumAmount", MIN_TRANSFER_AMOUNT);
            details.put("providedAmount", amount);
            throw new ValidationException(
                "BELOW_MINIMUM_AMOUNT",
                "Transfer amount must be at least ₹" + MIN_TRANSFER_AMOUNT,
                details
            );
        }
        
        if (amount.compareTo(MAX_TRANSFER_AMOUNT) > 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("maximumAmount", MAX_TRANSFER_AMOUNT);
            details.put("providedAmount", amount);
            throw new ValidationException(
                "EXCEEDS_MAXIMUM_AMOUNT",
                "Transfer amount cannot exceed ₹" + MAX_TRANSFER_AMOUNT,
                details
            );
        }
    }

    private void validateAccounts(String sourceAccountNumber, String destinationAccountNumber) {
        if (sourceAccountNumber == null || sourceAccountNumber.isBlank()) {
            throw new ValidationException("INVALID_SOURCE_ACCOUNT", "Source account number is required");
        }
        
        if (destinationAccountNumber == null || destinationAccountNumber.isBlank()) {
            throw new ValidationException("INVALID_DESTINATION_ACCOUNT", "Destination account number is required");
        }
        
        if (sourceAccountNumber.equals(destinationAccountNumber)) {
            throw new ValidationException("SELF_TRANSFER_NOT_ALLOWED", "Cannot transfer money to the same account");
        }
        
        if (!accountService.accountExists(destinationAccountNumber)) {
            throw new ResourceNotFoundException("Destination account not found: " + destinationAccountNumber);
        }
    }

    private void validateBalance(BigDecimal currentBalance, BigDecimal transferAmount) {
        if (currentBalance.compareTo(transferAmount) < 0) {
            Map<String, Object> details = new HashMap<>();
            details.put("currentBalance", currentBalance);
            details.put("requiredAmount", transferAmount);
            details.put("shortfall", transferAmount.subtract(currentBalance));
            
            throw new InsufficientFundsException(
                String.format("Insufficient funds. Available balance: ₹%s, Required amount: ₹%s",
                    currentBalance, transferAmount)
            );
        }
    }

    private String validateAndTrimDescription(String description) {
        if (description == null) {
            return "Fund Transfer";
        }
        
        String trimmed = description.trim();
        if (trimmed.isEmpty()) {
            return "Fund Transfer";
        }
        
        if (trimmed.length() > 100) {
            throw new ValidationException(
                "DESCRIPTION_TOO_LONG",
                "Transaction description cannot exceed 100 characters"
            );
        }
        
        return trimmed;
    }

    @Override
    public TransactionResponse getTransactionDetails(String transactionId) {
        Transaction transaction = transactionRepository.findByTransactionId(transactionId);
        if (transaction == null) {
            throw new ResourceNotFoundException("Transaction not found");
        }
        return convertToResponse(transaction);
    }

    @Override
    public List<TransactionResponse> getTransactionHistory(String accountNumber) {
        if (!accountService.accountExists(accountNumber)) {
            throw new ResourceNotFoundException("Account not found");
        }
        
        // Get both outgoing and incoming transactions
        List<Transaction> outgoingTransactions = transactionRepository.findBySourceAccountNumberOrderByTimestampDesc(accountNumber);
        List<Transaction> incomingTransactions = transactionRepository.findByDestinationAccountNumberOrderByTimestampDesc(accountNumber);
        
        // Combine and convert both types of transactions
        return Stream.concat(
                outgoingTransactions.stream().map(transaction -> {
                    TransactionResponse response = convertToResponse(transaction);
                    response.setTransactionType("DEBIT");
                    return response;
                }),
                incomingTransactions.stream().map(transaction -> {
                    TransactionResponse response = convertToResponse(transaction);
                    response.setTransactionType("CREDIT");
                    return response;
                })
            )
            .sorted(Comparator.comparing(TransactionResponse::getTimestamp).reversed())
            .collect(Collectors.toList());
    }

    private TransactionResponse convertToResponse(Transaction transaction) {
        TransactionResponse response = new TransactionResponse();
        response.setTransactionId(transaction.getTransactionId());
        response.setSourceAccountNumber(transaction.getSourceAccountNumber());
        response.setDestinationAccountNumber(transaction.getDestinationAccountNumber());
        response.setAmount(transaction.getAmount());
        response.setDescription(transaction.getDescription());
        response.setStatus(transaction.getStatus());
        response.setTimestamp(transaction.getTimestamp());
        response.setSourceAccountBalance(transaction.getSourceAccountBalance());
        return response;
    }
} 