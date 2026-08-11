package com.airline.service;

public class AttachmentScanUnavailableException extends RuntimeException {

    public AttachmentScanUnavailableException(String message) {
        super(message);
    }

    public AttachmentScanUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
