package com.bms.util;

import java.security.SecureRandom;
import java.util.Random;

public class PasswordGenerator {
    private static final String UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijklmnopqrstuvwxyz";
    private static final String DIGITS = "0123456789";
    private static final String SPECIAL = "!@#$%^&*";
    private static final Random RANDOM = new SecureRandom();

    public static String generatePassword() {
        StringBuilder sb = new StringBuilder();
        // Ensure at least one of each required character type
        sb.append(randomChar(UPPER));    // 1 uppercase
        sb.append(randomChar(LOWER));    // 1 lowercase
        sb.append(randomChar(DIGITS));   // 1 digit
        sb.append(randomChar(SPECIAL));  // 1 special
        sb.append(randomChar(UPPER));    // 1 uppercase
        sb.append(randomChar(LOWER));    // 1 lowercase
        sb.append(randomChar(DIGITS));   // 1 digit
        sb.append(randomChar(SPECIAL));  // 1 special (to make it 8 characters)
        return sb.toString();
    }

    private static char randomChar(String chars) {
        return chars.charAt(RANDOM.nextInt(chars.length()));
    }
} 