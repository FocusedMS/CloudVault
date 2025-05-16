package com.bms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
@Schema(description = "Login request containing account credentials")
public class LoginRequest {

    @NotBlank(message = "Account number is required")
    @Pattern(regexp = "^BANK[A-Z0-9]{6}$", message = "Account number must be in format BANK followed by 6 alphanumeric characters")
    @Schema(description = "Account number of the user", example = "BANK123456")
    private String accountNumber;

    @NotBlank(message = "Password is required")
    @Schema(description = "Password of the user", example = "SecurePass123!")
    private String password;
} 