package com.airline.service;

public class AttachmentRejectedException extends IllegalArgumentException {

    public AttachmentRejectedException(String message) {
        super(message);
    }
}
