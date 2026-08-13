package com.airline.disputes;

import com.airline.domain.DisputeAttachment;
import com.airline.service.AttachmentMalwareScanner;
import com.airline.service.DisputeAttachmentService;
import com.airline.service.FileStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

@SpringBootTest(properties = {
        "app.storage.local-dir=target/test-dispute-attachments",
        "app.attachments.max-size-bytes=1024",
        "app.attachments.retention-years=7"
})
@ActiveProfiles("e2e")
class DisputeAttachmentIntegrationTest {

    private static final String SUPPLIER = "ATTACH-GH";
    private static final String AIRLINE = "ATTACH-AL";
    private static final String OTHER_AIRLINE = "ATTACH-OTHER";
    private static final String DISPUTE_ID = "attachment-dispute";

    @Autowired private DisputeAttachmentService attachmentService;
    @Autowired private FileStorageService fileStorageService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @MockBean private AttachmentMalwareScanner malwareScanner;

    @BeforeEach
    void seed() {
        insertTenant(SUPPLIER, "GROUND_HANDLER");
        insertTenant(AIRLINE, "AIRLINE");
        insertTenant(OTHER_AIRLINE, "AIRLINE");
        insertUser("attachment-airline-user", AIRLINE, "INVOICE_DISPUTER");
        insertUser("attachment-other-user", OTHER_AIRLINE, "INVOICE_DISPUTER");
        jdbcTemplate.update("""
                INSERT INTO invoices (
                    id, invoice_number, tenant_id, airline_id, airport_code, currency,
                    issue_date, due_date, status, total_amount)
                VALUES ('attachment-invoice', 'INV-ATTACHMENT', ?, ?, 'DXB', 'USD',
                    DATE '2026-08-01', DATE '2026-08-31', 'DISPUTED', 100.00)
                """, SUPPLIER, AIRLINE);
        jdbcTemplate.update("""
                INSERT INTO disputes (
                    id, dispute_number, invoice_id, invoice_number, airline_id, supplier_id,
                    airport_code, status, category, disputed_amount, credit_note_amount,
                    initiator_comment)
                VALUES (?, 'DSP-ATTACHMENT', 'attachment-invoice', 'INV-ATTACHMENT', ?, ?,
                    'DXB', 'OPEN', 'OPERATIONAL_DATA_MISMATCH', 100.00, 0.00, 'Evidence attached')
                """, DISPUTE_ID, AIRLINE, SUPPLIER);
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        List<String> keys = jdbcTemplate.queryForList(
                "SELECT storage_key FROM dispute_attachments WHERE dispute_id = ?",
                String.class,
                DISPUTE_ID);
        keys.forEach(fileStorageService::delete);
        jdbcTemplate.update("DELETE FROM dispute_attachments WHERE dispute_id = ?", DISPUTE_ID);
        jdbcTemplate.update("DELETE FROM disputes WHERE id = ?", DISPUTE_ID);
        jdbcTemplate.update("UPDATE invoices SET status = 'DRAFT' WHERE id = 'attachment-invoice'");
        jdbcTemplate.update("DELETE FROM invoices WHERE id = 'attachment-invoice'");
        jdbcTemplate.update("DELETE FROM users WHERE tenant_id IN (?, ?, ?)",
                SUPPLIER, AIRLINE, OTHER_AIRLINE);
        jdbcTemplate.update("DELETE FROM tenants WHERE id IN (?, ?, ?)",
                SUPPLIER, AIRLINE, OTHER_AIRLINE);
        reset(malwareScanner);
    }

    @Test
    void cleanAttachmentRoundTripsWithTenantNamespaceAndRetentionMetadata() {
        authenticate("attachment-airline-user", AIRLINE);
        byte[] content = "%PDF-1.4 supporting evidence".getBytes(StandardCharsets.US_ASCII);

        DisputeAttachment uploaded = attachmentService.upload(
                DISPUTE_ID,
                new MockMultipartFile("file", "evidence.pdf", "application/pdf", content));

        assertThat(uploaded.getStorageKey())
                .startsWith("attachments/" + AIRLINE + "/" + DISPUTE_ID + "/");
        assertThat(uploaded.getRetentionUntil()).isEqualTo(uploaded.getUploadedAt().plusYears(7));
        assertThat(attachmentService.list(DISPUTE_ID)).extracting(DisputeAttachment::getId)
                .containsExactly(uploaded.getId());
        assertThat(attachmentService.download(DISPUTE_ID, uploaded.getId()).content())
                .isEqualTo(content);
        verify(malwareScanner).assertClean(content);
    }

    @Test
    void unrelatedAirlineCannotInferOrDownloadAttachment() {
        authenticate("attachment-airline-user", AIRLINE);
        DisputeAttachment uploaded = attachmentService.upload(
                DISPUTE_ID,
                new MockMultipartFile(
                        "file", "evidence.pdf", "application/pdf",
                        "%PDF-1.4 evidence".getBytes(StandardCharsets.US_ASCII)));

        authenticate("attachment-other-user", OTHER_AIRLINE);

        assertThatThrownBy(() -> attachmentService.download(DISPUTE_ID, uploaded.getId()))
                .isInstanceOf(java.util.NoSuchElementException.class)
                .hasMessageContaining("Dispute not found");
    }

    private void authenticate(String userId, String tenantId) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(userId)
                .claim("tenant_id", tenantId)
                .claim("tenant_type", "AIRLINE")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("INVOICE_DISPUTER")),
                userId));
    }

    private void insertTenant(String id, String type) {
        jdbcTemplate.update("""
                INSERT INTO tenants (id, name, type, status)
                VALUES (?, ?, ?, 'ACTIVE')
                """, id, id, type);
    }

    private void insertUser(String id, String tenantId, String role) {
        jdbcTemplate.update("""
                INSERT INTO users (id, tenant_id, username, email, roles)
                VALUES (?, ?, ?, ?, ?)
                """, id, tenantId, id, id + "@local.invalid", role);
    }
}
