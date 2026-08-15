package com.airline.domain;

import jakarta.persistence.Convert;
import jakarta.persistence.Enumerated;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

class FormulaTypeConverterTest {

    private final FormulaTypeConverter converter = new FormulaTypeConverter();

    @Test
    void roundTripsEstablishedDatabaseValues() {
        for (FormulaType type : FormulaType.values()) {
            String databaseValue = converter.convertToDatabaseColumn(type);

            assertThat(databaseValue).isEqualTo(type.getValue());
            assertThat(converter.convertToEntityAttribute(databaseValue)).isEqualTo(type);
        }
    }

    @Test
    void preservesNullValues() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void serviceConfigurationUsesTheValueConverterInsteadOfEnumNames() throws Exception {
        Field field = ServiceConfiguration.class.getDeclaredField("formulaType");

        assertThat(field.getAnnotation(Convert.class).converter())
                .isEqualTo(FormulaTypeConverter.class);
        assertThat(field.getAnnotation(Enumerated.class)).isNull();
    }
}
