package com.bms.service.impl;

import com.bms.dto.LoginRequest;
import com.bms.dto.LoginResponse;
import com.bms.entity.Account;
import com.bms.entity.User;
import com.bms.exception.AuthenticationException;
import com.bms.repository.AccountRepository;
import com.bms.repository.UserRepository;
import com.bms.service.AuthService;
import com.bms.util.JwtUtil;
import com.bms.util.PasswordUtil;
import com.bms.service.RefreshTokenService;
import com.bms.entity.RefreshToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthServiceImpl.class);

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private PasswordUtil passwordUtil;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Override
    public LoginResponse authenticate(LoginRequest request) {
        logger.debug("Attempting authentication for account: {}", request.getAccountNumber());
        
        // Find user by account number
        User user = userRepository.findByAccountNumber(request.getAccountNumber())
                .orElseThrow(() -> {
                    logger.error("User not found for account number: {}", request.getAccountNumber());
                    return new AuthenticationException("Invalid account number or password");
                });

        logger.debug("User found, verifying password");

        // Verify password
        if (!passwordUtil.verifyPassword(request.getPassword(), user.getPassword())) {
            logger.error("Password verification failed for account: {}", request.getAccountNumber());
            throw new AuthenticationException("Invalid account number or password");
        }

        logger.debug("Password verified successfully");

        // Get account details
        Account account = accountRepository.findByAccountNumber(user.getAccountNumber())
                .orElseThrow(() -> {
                    logger.error("Account not found for user: {}", user.getAccountNumber());
                    return new AuthenticationException("Account not found");
                });

        logger.debug("Account details retrieved successfully");

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getAccountNumber());
        LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(1); // Token valid for 1 hour

        // Generate refresh token
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getAccountNumber());

        logger.debug("Tokens generated successfully");

        // Create and return response
        return new LoginResponse(
                "Login successful",
                token,
                tokenExpiry,
                account.getCustomer().getFullName(),
                account.getAccountNumber(),
                account.getBalance().doubleValue(),
                refreshToken.getToken(),
                refreshToken.getExpiryDate().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()
        );
    }
} 