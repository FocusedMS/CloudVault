package com.bms.controller;

import com.bms.dto.LoginRequest;
import com.bms.dto.LoginResponse;
import com.bms.dto.LogoutResponse;
import com.bms.dto.TokenRefreshResponse;
import com.bms.dto.RefreshTokenRequest;
import com.bms.dto.PasswordResetRequest;
import com.bms.service.AuthService;
import com.bms.service.PasswordResetService;
import com.bms.util.JwtUtil;
import com.bms.service.RefreshTokenService;
import com.bms.entity.RefreshToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.bms.exception.UserNotFoundException;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "APIs for user authentication")
@CrossOrigin(origins = "${app.cors.allowed-origins}", allowCredentials = "true")
public class AuthController {

    @Autowired
    private AuthService authService;
    
    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Operation(
        summary = "Login to the system",
        description = "Authenticate user with account number and password"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Login successful",
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(hidden = true)
        )
    )
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @Operation(
        summary = "Logout from the system",
        description = "Invalidate the current session and clear security context"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Logout successful",
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(hidden = true)
        )
    )
    @PostMapping("/logout")
    public ResponseEntity<LogoutResponse> logout(@RequestBody(required = false) String refreshToken) {
        SecurityContextHolder.clearContext();
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.deleteByToken(refreshToken);
        }
        return new ResponseEntity<>(
            new LogoutResponse("Logout successful"),
            HttpStatus.OK
        );
    }

    @Operation(
        summary = "Refresh authentication token",
        description = "Generate a new JWT token using the current token"
    )
    @ApiResponse(
        responseCode = "200",
        description = "Token refreshed successfully",
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            schema = @Schema(hidden = true)
        )
    )
    @PostMapping("/refresh-token")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        String accountNumber = request.getAccountNumber();
        if (refreshTokenService.validateRefreshToken(refreshToken, accountNumber)) {
            String newToken = jwtUtil.generateToken(accountNumber);
            LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(1);
            return new ResponseEntity<>(
                new TokenRefreshResponse("Token refreshed successfully", newToken, tokenExpiry),
                HttpStatus.OK
            );
        }
        return new ResponseEntity<>(
            new TokenRefreshResponse("Invalid or expired refresh token", null, null),
            HttpStatus.UNAUTHORIZED
        );
    }

    @PostMapping("/reset-password/initiate")
    public ResponseEntity<?> initiatePasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        System.out.println("Received password reset request: " + request);
        try {
            if (request == null || request.getAccountNumber() == null) {
                System.out.println("Request or account number is null");
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Account number is required"
                ));
            }

            String accountNumber = request.getAccountNumber();
            System.out.println("Processing reset request for account: " + accountNumber);

            if (!accountNumber.matches("^BANK[A-Z0-9]{6}$")) {
                System.out.println("Invalid account number format: " + accountNumber);
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid account number format. Must be BANK followed by 6 alphanumeric characters"
                ));
            }

            String token = passwordResetService.initiateReset(accountNumber);
            System.out.println("Generated reset token for account: " + accountNumber);
            return ResponseEntity.ok().body(Map.of(
                "message", "Password reset initiated successfully",
                "token", token
            ));
        } catch (UserNotFoundException e) {
            System.out.println("User not found: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            System.out.println("Error processing reset request: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "An error occurred while processing your request: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/reset-password/validate")
    public ResponseEntity<?> validateResetToken(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            boolean isValid = passwordResetService.validateToken(token);
            return ResponseEntity.ok().body(Map.of(
                "valid", isValid
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/reset-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            String newPassword = request.get("newPassword");
            passwordResetService.resetPassword(token, newPassword);
            return ResponseEntity.ok().body(Map.of(
                "message", "Password reset successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }
} 