package com.airline.service;

public interface FileStorageService {
    /**
     * Stores file bytes under a given filename/key.
     * @param filename the relative filename or path key
     * @param bytes the file payload bytes
     * @return the generated file key/path
     */
    String store(String filename, byte[] bytes);

    /**
     * Loads file bytes for a given file key.
     * @param fileKey the file key/path
     * @return the file payload bytes
     */
    byte[] load(String fileKey);

    /**
     * Deletes a file for a given file key.
     * @param fileKey the file key/path
     */
    void delete(String fileKey);
}
