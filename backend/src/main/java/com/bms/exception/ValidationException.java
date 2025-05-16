package com.bms.exception;

import lombok.Getter;
import java.util.Map;

@Getter
public class ValidationException extends RuntimeException {
    private final String code;
    private final Map<String, Object> details;

    public ValidationException(String code, String message) {
        super(message);
        this.code = code;
        this.details = null;
    }

    public ValidationException(String code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details;
    }
} 