package com.airline.domain;

public enum DisputeCategory {
    OPERATIONAL_DATA_MISMATCH("Operational data mismatch"),
    CONTRACT_RATE_FORMULA_MISMATCH("Contract rate/formula mismatch"),
    EXCHANGE_RATE_MISMATCH("Exchange rate mismatch"),
    REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE("Referenced flight does not belong to the airline"),
    MISCELLANEOUS("Miscellaneous");

    private final String value;

    DisputeCategory(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
