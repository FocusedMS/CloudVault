package com.bms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class PasswordResetRequest {
    @NotBlank(message = "Account number is required")
    @Pattern(regexp = "^BANK[A-Z0-9]{6}$", message = "Invalid account number format")
    private String accountNumber;

    // Getters and setters
    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    @Override
    public String toString() {
        return "PasswordResetRequest{" +
                "accountNumber='" + accountNumber + '\'' +
                '}';
    }
} 