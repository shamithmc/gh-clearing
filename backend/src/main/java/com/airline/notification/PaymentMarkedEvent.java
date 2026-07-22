package com.airline.notification;

import java.math.BigDecimal;
import java.util.Set;

public record PaymentMarkedEvent(
        String invoiceId,
        String invoiceNumber,
        String groundHandlerId,
        String airlineId,
        String airportCode,
        Set<String> chargeCodes,
        BigDecimal totalAmount,
        String currency) {
}
