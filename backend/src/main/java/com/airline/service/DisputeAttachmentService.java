package com.airline.service;

import com.airline.domain.DisputeAttachment;
import com.airline.domain.DisputeAttachmentScanStatus;
import com.airline.repository.DisputeAttachmentRepository;
import com.airline.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class DisputeAttachmentService {

    private static final Logger logger = LoggerFactory.getLogger(DisputeAttachmentService.class);
    private static final Pattern SAFE_SEGMENT = Pattern.compile("[A-Za-z0-9_-]+");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "application/pdf", ".pdf",
            "image/png", ".png",
            "image/jpeg", ".jpg");

    private final DisputeAttachmentRepository attachmentRepository;
    private final DisputeService disputeService;
    private final FileStorageService fileStorageService;
    private final AttachmentMalwareScanner malwareScanner;
    private final TenantContext tenantContext;
    private final long maxSizeBytes;
    private final int retentionYears;

    public DisputeAttachmentService(
            DisputeAttachmentRepository attachmentRepository,
            DisputeService disputeService,
            FileStorageService fileStorageService,
            AttachmentMalwareScanner malwareScanner,
            TenantContext tenantContext,
            @Value("${app.attachments.max-size-bytes:10485760}") long maxSizeBytes,
            @Value("${app.attachments.retention-years:7}") int retentionYears) {
        this.attachmentRepository = attachmentRepository;
        this.disputeService = disputeService;
        this.fileStorageService = fileStorageService;
        this.malwareScanner = malwareScanner;
        this.tenantContext = tenantContext;
        if (maxSizeBytes <= 0 || retentionYears <= 0) {
            throw new IllegalStateException("Attachment size and retention configuration must be positive");
        }
        this.maxSizeBytes = maxSizeBytes;
        this.retentionYears = retentionYears;
    }

    @Transactional
    public DisputeAttachment upload(String disputeId, MultipartFile file) {
        disputeService.getDisputeById(disputeId);
        byte[] content = readAndValidateSize(file);
        String detectedMediaType = detectMediaType(content);
        if (!detectedMediaType.equals(file.getContentType())) {
            throw new AttachmentRejectedException("Attachment MIME type does not match its content");
        }
        String originalFilename = safeOriginalFilename(file.getOriginalFilename());
        malwareScanner.assertClean(content);

        String tenantId = safeSegment(tenantContext.getCurrentTenantId(), "tenant ID");
        String safeDisputeId = safeSegment(disputeId, "dispute ID");
        String keyHint = "attachments/" + tenantId + "/" + safeDisputeId
                + "/attachment" + EXTENSIONS.get(detectedMediaType);
        String storageKey = fileStorageService.store(keyHint, content);
        OffsetDateTime uploadedAt = OffsetDateTime.now();
        DisputeAttachment attachment = DisputeAttachment.builder()
                .id(UUID.randomUUID().toString())
                .disputeId(disputeId)
                .uploaderTenantId(tenantId)
                .uploaderUserId(currentUserId())
                .originalFilename(originalFilename)
                .mediaType(detectedMediaType)
                .sizeBytes(content.length)
                .sha256(sha256(content))
                .storageKey(storageKey)
                .scanStatus(DisputeAttachmentScanStatus.CLEAN)
                .uploadedAt(uploadedAt)
                .retentionUntil(uploadedAt.plusYears(retentionYears))
                .build();
        boolean synchronizedTransaction = TransactionSynchronizationManager.isSynchronizationActive();
        if (synchronizedTransaction) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != TransactionSynchronization.STATUS_COMMITTED) {
                        removeStoredPayload(storageKey);
                    }
                }
            });
        }
        try {
            return attachmentRepository.save(attachment);
        } catch (RuntimeException exception) {
            if (!synchronizedTransaction) {
                removeStoredPayload(storageKey);
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<DisputeAttachment> list(String disputeId) {
        disputeService.getDisputeById(disputeId);
        return attachmentRepository.findAllByDisputeIdOrderByUploadedAtAsc(disputeId);
    }

    @Transactional(readOnly = true)
    public AttachmentDownload download(String disputeId, String attachmentId) {
        disputeService.getDisputeById(disputeId);
        DisputeAttachment attachment = attachmentRepository.findByIdAndDisputeId(attachmentId, disputeId)
                .orElseThrow(() -> new java.util.NoSuchElementException(
                        "Dispute attachment not found: " + attachmentId));
        byte[] content = fileStorageService.load(attachment.getStorageKey());
        if (!attachment.getSha256().equals(sha256(content))) {
            throw new IllegalStateException("Dispute attachment integrity verification failed");
        }
        return new AttachmentDownload(attachment, content);
    }

    private byte[] readAndValidateSize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AttachmentRejectedException("Attachment must not be empty");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new AttachmentRejectedException("Attachment exceeds the maximum allowed size");
        }
        try {
            byte[] content = file.getBytes();
            if (content.length > maxSizeBytes) {
                throw new AttachmentRejectedException("Attachment exceeds the maximum allowed size");
            }
            return content;
        } catch (IOException exception) {
            throw new AttachmentRejectedException("Attachment could not be read");
        }
    }

    private String detectMediaType(byte[] content) {
        if (startsWith(content, "%PDF-".getBytes(StandardCharsets.US_ASCII))) {
            return "application/pdf";
        }
        if (startsWith(content, new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a})) {
            return "image/png";
        }
        if (content.length >= 4
                && content[0] == (byte) 0xff
                && content[1] == (byte) 0xd8
                && content[2] == (byte) 0xff) {
            return "image/jpeg";
        }
        throw new AttachmentRejectedException("Attachment content is not an allowed PDF, PNG, or JPEG file");
    }

    private boolean startsWith(byte[] content, byte[] signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (content[index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private String safeOriginalFilename(String filename) {
        if (filename == null) {
            throw new AttachmentRejectedException("Attachment filename is required");
        }
        String normalized = filename.replace('\\', '/');
        normalized = normalized.substring(normalized.lastIndexOf('/') + 1)
                .replaceAll("[\\p{Cntrl}]", "")
                .trim();
        if (normalized.isEmpty() || normalized.length() > 255) {
            throw new AttachmentRejectedException("Attachment filename is invalid");
        }
        return normalized;
    }

    private String safeSegment(String value, String label) {
        if (value == null || !SAFE_SEGMENT.matcher(value).matches()) {
            throw new AttachmentRejectedException("Attachment " + label + " is invalid");
        }
        return value;
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authenticated user is required");
        }
        return authentication.getName();
    }

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private void removeStoredPayload(String storageKey) {
        try {
            fileStorageService.delete(storageKey);
        } catch (RuntimeException cleanupFailure) {
            logger.error("Failed to remove rolled-back dispute attachment payload: {}", storageKey, cleanupFailure);
        }
    }

    public record AttachmentDownload(DisputeAttachment metadata, byte[] content) {
    }
}
