package com.bms.service.impl;

import com.bms.dto.AccountCreationRequest;
import com.bms.dto.AccountCreationResponse;
import com.bms.entity.Account;
import com.bms.entity.Customer;
import com.bms.entity.User;
import com.bms.exception.ResourceNotFoundException;
import com.bms.repository.AccountRepository;
import com.bms.repository.CustomerRepository;
import com.bms.repository.UserRepository;
import com.bms.service.AccountService;
import com.bms.util.PasswordGenerator;
import com.bms.util.PasswordUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Optional;

@Service
public class AccountServiceImpl implements AccountService {
    
    private static final Logger logger = LoggerFactory.getLogger(AccountServiceImpl.class);

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordUtil passwordUtil;

    @Override
    @Transactional
    public AccountCreationResponse createAccount(AccountCreationRequest request) {
        try {
            // Check if ID number already exists
            if (customerRepository.existsByIdNumber(request.getIdNumber())) {
                throw new RuntimeException("ID number " + request.getIdNumber() + " is already registered");
            }

            LocalDateTime now = LocalDateTime.now();

            // Create customer
            Customer customer = new Customer();
            customer.setFullName(request.getFullName());
            customer.setDateOfBirth(request.getDateOfBirth());
            customer.setNationality(request.getNationality());
            customer.setPhoneNumber(request.getPhoneNumber());
            customer.setPermanentAddress(request.getPermanentAddress());
            customer.setGovernmentIssuedID(request.getGovernmentIssuedID());
            customer.setIdNumber(request.getIdNumber());
            customer.setCreatedAt(now);
            customer.setUpdatedAt(now);

            // Generate password and hash it
            String password = generatePassword();
            String hashedPassword = passwordUtil.hashPassword(password);

            // Create account
            Account account = new Account();
            String accountNumber = generateAccountNumber();
            account.setAccountNumber(accountNumber);
            account.setAccountType(request.getAccountType());
            account.setBalance(request.getInitialDeposit());
            account.setAccountCreationDate(now);
            account.setCreatedAt(now);
            account.setUpdatedAt(now);

            // Save customer first
            customer = customerRepository.save(customer);
            
            // Set up relationship
            account.setCustomer(customer);
            
            // Save account
            account = accountRepository.save(account);

            // Create user for authentication
            User user = new User();
            user.setAccountNumber(accountNumber);
            user.setPassword(hashedPassword);
            userRepository.save(user);

            // Prepare response
            return new AccountCreationResponse(
                    "Bank account created successfully.",
                    password,
                    new AccountCreationResponse.AccountDetails(
                            account.getAccountNumber(),
                            account.getCustomer().getFullName(),
                            account.getCustomer().getPhoneNumber(),
                            account.getCustomer().getPermanentAddress(),
                            account.getCustomer().getGovernmentIssuedID(),
                            account.getCustomer().getIdNumber(),
                            account.getAccountType().name(),
                            account.getBalance().doubleValue(),
                            account.getAccountCreationDate()
                    )
            );
        } catch (DataIntegrityViolationException e) {
            logger.error("Database constraint violation: {}", e.getMessage());
            throw new RuntimeException("A record with this information already exists");
        } catch (IllegalArgumentException e) {
            logger.error("Invalid input: {}", e.getMessage());
            throw new RuntimeException("Invalid input: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to create account: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create account: " + e.getMessage());
        }
    }

    @Override
    public BigDecimal getAccountBalance(String accountNumber) throws ResourceNotFoundException {
        Optional<Account> accountOptional = accountRepository.findByAccountNumber(accountNumber);
        Account account = accountOptional.orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        return account.getBalance();
    }

    @Override
    public boolean accountExists(String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber).isPresent();
    }

    @Override
    @Transactional
    public void updateBalance(String accountNumber, BigDecimal amount) throws ResourceNotFoundException {
        Optional<Account> accountOptional = accountRepository.findByAccountNumber(accountNumber);
        Account account = accountOptional.orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));
        
        synchronized (account.getAccountNumber().intern()) {
            // Refresh account data to get the latest balance
            account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountNumber));
        
            BigDecimal newBalance = account.getBalance().add(amount);
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Insufficient funds: Balance cannot be negative");
            }
        
            account.setBalance(newBalance);
            account.setUpdatedAt(LocalDateTime.now());
            accountRepository.save(account);
        }
    }

    @Override
    public Account getAccountByAccountNumber(String accountNumber) throws ResourceNotFoundException {
        return accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    private String generateAccountNumber() {
        String accountNumber;
        do {
            accountNumber = "BANK" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        } while (accountRepository.existsByAccountNumber(accountNumber));
        return accountNumber;
    }

    private String generatePassword() {
        return PasswordGenerator.generatePassword();
    }
} 