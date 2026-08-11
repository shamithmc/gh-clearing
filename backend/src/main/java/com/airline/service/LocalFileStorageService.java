package com.airline.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path storageDirectory;

    public LocalFileStorageService(@Value("${app.storage.local-dir:uploads}") String storageDir) {
        this.storageDirectory = Paths.get(storageDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory: " + this.storageDirectory, e);
        }
    }

    @Override
    public String store(String filename, byte[] bytes) {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Filename must not be null or empty");
        }
        Path requestedPath = Path.of(filename.replace('\\', '/')).normalize();
        if (requestedPath.isAbsolute() || requestedPath.startsWith("..")) {
            throw new IllegalArgumentException("Cannot store file outside of storage directory");
        }

        String extension = "";
        String requestedFileName = requestedPath.getFileName().toString();
        int dotIndex = requestedFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = requestedFileName.substring(dotIndex);
        }

        Path requestedParent = requestedPath.getParent();
        String key = (requestedParent == null ? Path.of("") : requestedParent)
                .resolve(UUID.randomUUID().toString() + extension)
                .toString()
                .replace('\\', '/');
        Path targetPath = this.storageDirectory.resolve(key).normalize();

        if (!targetPath.startsWith(this.storageDirectory) || targetPath.equals(this.storageDirectory)) {
            throw new IllegalArgumentException("Cannot store file outside of storage directory");
        }

        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, bytes);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + filename, e);
        }
    }

    @Override
    public byte[] load(String fileKey) {
        if (fileKey == null || fileKey.isEmpty()) {
            throw new IllegalArgumentException("File key must not be null or empty");
        }

        Path filePath = this.storageDirectory.resolve(fileKey).normalize();

        if (!filePath.startsWith(this.storageDirectory) || filePath.equals(this.storageDirectory)) {
            throw new IllegalArgumentException("Cannot access file outside of storage directory");
        }

        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File not found: " + fileKey);
        }

        try {
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + fileKey, e);
        }
    }

    @Override
    public void delete(String fileKey) {
        if (fileKey == null || fileKey.isEmpty()) {
            return;
        }

        Path filePath = this.storageDirectory.resolve(fileKey).normalize();

        if (!filePath.startsWith(this.storageDirectory) || filePath.equals(this.storageDirectory)) {
            throw new IllegalArgumentException("Cannot delete file outside of storage directory");
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + fileKey, e);
        }
    }
}
