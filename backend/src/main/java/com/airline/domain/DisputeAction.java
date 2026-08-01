package com.airline.domain;

import java.util.Locale;

public enum DisputeAction {
    ACKNOWLEDGE,
    RESPOND,
    ACCEPT,
    REJECT,
    ESCALATE;

    public static DisputeAction parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Dispute action is required");
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported dispute action: " + value);
        }
    }
}
