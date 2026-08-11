package com.airline.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTest {

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        fileStorageService = new LocalFileStorageService(tempDir.toString());
        ((LocalFileStorageService) fileStorageService).init();
    }

    @Test
    void store_andLoad_succeeds() {
        byte[] content = "Hello, Storage!".getBytes();
        String fileKey = fileStorageService.store("test-invoice.xml", content);

        assertThat(fileKey).isNotNull().isNotEmpty();
        assertThat(fileKey).endsWith(".xml");

        byte[] loaded = fileStorageService.load(fileKey);
        assertThat(new String(loaded)).isEqualTo("Hello, Storage!");
    }

    @Test
    void load_nonExistentKey_throws() {
        assertThatThrownBy(() -> fileStorageService.load("non-existent-key.xml"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File not found");
    }

    @Test
    void delete_succeeds() {
        byte[] content = "Goodbye!".getBytes();
        String fileKey = fileStorageService.store("test.pdf", content);

        fileStorageService.delete(fileKey);

        assertThatThrownBy(() -> fileStorageService.load(fileKey))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("File not found");
    }

    @Test
    void delete_nonExistentKey_doesNotThrow() {
        fileStorageService.delete("non-existent-key.pdf");
    }

    @Test
    void tenantNamespacedStore_andLoad_succeeds() {
        byte[] content = "%PDF-test".getBytes();

        String key = fileStorageService.store(
                "attachments/EK/dispute-1/evidence.pdf", content);

        assertThat(key).startsWith("attachments/EK/dispute-1/").endsWith(".pdf");
        assertThat(fileStorageService.load(key)).isEqualTo(content);
    }

    @Test
    void pathTraversal_isRejectedForStoreLoadAndDelete() {
        assertThatThrownBy(() -> fileStorageService.store("../outside.pdf", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside");
        assertThatThrownBy(() -> fileStorageService.load("../outside.pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside");
        assertThatThrownBy(() -> fileStorageService.delete("../outside.pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside");
    }
}
