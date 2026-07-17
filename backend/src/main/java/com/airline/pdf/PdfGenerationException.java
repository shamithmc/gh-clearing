package com.airline.pdf;

/**
 * Thrown when PDF generation fails during invoice rendering or PDF conversion.
 */
public class PdfGenerationException extends RuntimeException {

    public PdfGenerationException(String message, Throwable cause) {
        super(message, cause);
    }

    public PdfGenerationException(String message) {
        super(message);
    }
}
