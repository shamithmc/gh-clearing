package com.airline.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum FormulaType {
    PF_01("PF-01"),
    PF_02("PF-02"),
    PF_03("PF-03"),
    PF_04("PF-04"),
    PF_05("PF-05"),
    PF_06("PF-06"),
    PF_07("PF-07");

    private final String value;

    FormulaType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static FormulaType fromValue(String value) {
        for (FormulaType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown formula type: " + value);
    }
}
