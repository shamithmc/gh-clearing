package com.airline.service;

import com.airline.domain.DisputeAttachment;
import com.airline.repository.DisputeAttachmentRepository;
import com.airline.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DisputeAttachmentServiceTest {

    @Mock private DisputeAttachmentRepository attachmentRepository;
    @Mock private DisputeService disputeService;
    @Mock private FileStorageService fileStorageService;
    @Mock private AttachmentMalwareScanner malwareScanner;
    @Mock private TenantContext tenantContext;

    private DisputeAttachmentService service;

    @BeforeEach
    void setUp() {
        service = new DisputeAttachmentService(
                attachmentRepository,
                disputeService,
                fileStorageService,
                malwareScanner,
                tenantContext,
                32,
                7);
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("airline-user", "n/a", "INVOICE_DISPUTER"));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadPersistsCleanMetadataUnderTenantAndDisputeNamespace() {
        byte[] pdf = "%PDF-1.4 test".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile(
                "file", "../evidence.pdf", "application/pdf", pdf);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(fileStorageService.store("attachments/EK/dispute-1/attachment.pdf", pdf))
                .thenReturn("attachments/EK/dispute-1/key.pdf");
        when(attachmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DisputeAttachment saved = service.upload("dispute-1", file);

        assertThat(saved.getOriginalFilename()).isEqualTo("evidence.pdf");
        assertThat(saved.getMediaType()).isEqualTo("application/pdf");
        assertThat(saved.getStorageKey()).startsWith("attachments/EK/dispute-1/");
        assertThat(saved.getUploaderTenantId()).isEqualTo("EK");
        assertThat(saved.getUploaderUserId()).isEqualTo("airline-user");
        assertThat(saved.getRetentionUntil()).isEqualTo(saved.getUploadedAt().plusYears(7));
        verify(malwareScanner).assertClean(pdf);
    }

    @Test
    void uploadRejectsMimeContentMismatchBeforeScanningOrStorage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.png", "image/png", "%PDF-1.4".getBytes(StandardCharsets.US_ASCII));

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(AttachmentRejectedException.class)
                .hasMessageContaining("does not match");

        verifyNoInteractions(malwareScanner, fileStorageService, attachmentRepository);
    }

    @Test
    void uploadRejectsUnknownMagicBytes() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "payload.jpg", "image/jpeg", "not-an-image".getBytes(StandardCharsets.US_ASCII));

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(AttachmentRejectedException.class)
                .hasMessageContaining("not an allowed");

        verifyNoInteractions(malwareScanner, fileStorageService, attachmentRepository);
    }

    @Test
    void uploadRejectsOversizedContentBeforeScanningOrStorage() {
        byte[] content = new byte[33];
        content[0] = '%';
        MockMultipartFile file = new MockMultipartFile("file", "large.pdf", "application/pdf", content);

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(AttachmentRejectedException.class)
                .hasMessageContaining("maximum allowed size");

        verifyNoInteractions(malwareScanner, fileStorageService, attachmentRepository);
    }

    @Test
    void uploadFailsClosedWhenScannerIsUnavailable() {
        byte[] pdf = "%PDF-1.4 test".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "evidence.pdf", "application/pdf", pdf);
        org.mockito.Mockito.doThrow(new AttachmentScanUnavailableException("offline"))
                .when(malwareScanner).assertClean(pdf);

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(AttachmentScanUnavailableException.class);

        verifyNoInteractions(fileStorageService, attachmentRepository);
    }

    @Test
    void unauthorizedDisputeAccessStopsBeforeReadingOrStoringFile() {
        org.mockito.Mockito.doThrow(new AccessDeniedException("outside tenant"))
                .when(disputeService).getDisputeById("dispute-1");
        MockMultipartFile file = new MockMultipartFile(
                "file", "evidence.pdf", "application/pdf", "%PDF-1.4".getBytes(StandardCharsets.US_ASCII));

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(malwareScanner, fileStorageService, attachmentRepository);
    }

    @Test
    void crossTenantDownloadStopsBeforeAttachmentLookupOrStorageRead() {
        org.mockito.Mockito.doThrow(new java.util.NoSuchElementException("not found"))
                .when(disputeService).getDisputeById("other-dispute");

        assertThatThrownBy(() -> service.download("other-dispute", "attachment-1"))
                .isInstanceOf(java.util.NoSuchElementException.class);

        verify(attachmentRepository, never()).findByIdAndDisputeId(any(), any());
        verify(fileStorageService, never()).load(any());
    }

    @Test
    void persistenceFailureRemovesStoredPayload() {
        byte[] pdf = "%PDF-1.4 test".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "evidence.pdf", "application/pdf", pdf);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(fileStorageService.store(any(), any())).thenReturn("attachments/EK/dispute-1/key.pdf");
        when(attachmentRepository.save(any())).thenThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> service.upload("dispute-1", file))
                .isInstanceOf(IllegalStateException.class);

        verify(fileStorageService).delete("attachments/EK/dispute-1/key.pdf");
    }

    @Test
    void transactionRollbackRemovesPayloadStoredBeforeDatabaseCommit() {
        byte[] pdf = "%PDF-1.4 test".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "evidence.pdf", "application/pdf", pdf);
        when(tenantContext.getCurrentTenantId()).thenReturn("EK");
        when(fileStorageService.store(any(), any())).thenReturn("attachments/EK/dispute-1/key.pdf");
        when(attachmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.upload("dispute-1", file);
            TransactionSynchronization synchronization = TransactionSynchronizationManager
                    .getSynchronizations()
                    .get(0);

            synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

            verify(fileStorageService).delete("attachments/EK/dispute-1/key.pdf");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
