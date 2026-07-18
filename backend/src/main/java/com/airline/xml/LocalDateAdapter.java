package com.airline.xml;

import jakarta.xml.bind.annotation.adapters.XmlAdapter;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * JAXB adapter for Java's {@link LocalDate} ↔ xs:date (yyyy-MM-dd).
 * Required because JAXB cannot natively serialize Java 8+ date types.
 */
public class LocalDateAdapter extends XmlAdapter<String, LocalDate> {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    @Override
    public LocalDate unmarshal(String v) {
        if (v == null || v.isBlank()) return null;
        return LocalDate.parse(v, FORMATTER);
    }

    @Override
    public String marshal(LocalDate v) {
        if (v == null) return null;
        return v.format(FORMATTER);
    }
}
