package com.airline.pricing;

import java.math.BigDecimal;

public final class PricingValidation {

    private PricingValidation() {
    }

    public static BigDecimal nonNegativeDecimal(Object value, String field) {
        if (value == null) {
            throw new IllegalArgumentException("Missing numeric value: " + field);
        }
        final BigDecimal decimal;
        try {
            decimal = new BigDecimal(value.toString());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid numeric value for " + field, exception);
        }
        if (decimal.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(field + " must not be negative");
        }
        return decimal;
    }
}
