package com.airline.xml;

/**
 * Thrown when application XML generation or local contract validation fails.
 * Per Architecture Contract INV-09: any invoice failing XML validation MUST NOT be dispatched.
 */
public class XmlGenerationException extends RuntimeException {

    public XmlGenerationException(String message, Throwable cause) {
        super(message, cause);
    }

    public XmlGenerationException(String message) {
        super(message);
    }
}
