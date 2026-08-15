package com.airline.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Persists formula types using their external PF-01 style values. */
@Converter
public class FormulaTypeConverter implements AttributeConverter<FormulaType, String> {

    @Override
    public String convertToDatabaseColumn(FormulaType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public FormulaType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : FormulaType.fromValue(dbData);
    }
}
