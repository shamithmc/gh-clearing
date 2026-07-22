package com.airline.notification;

import java.util.Set;

public record ContractReviewRequestedEvent(
        String contractId,
        String groundHandlerId,
        String airlineId,
        String airportCode,
        Set<String> chargeCodes,
        String comment) {
}
