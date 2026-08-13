package com.airline.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DatabaseIntegrityControlsTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String suffix;
    private String supplierId;
    private String otherSupplierId;
    private String airlineId;
    private String invoiceId;
    private String invoiceLineId;
    private String disputeId;

    @BeforeEach
    void setUp() {
        suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        supplierId = "DBI-GH-" + suffix;
        otherSupplierId = "DBI-G2-" + suffix;
        airlineId = "DBI-AIR-" + suffix;
        invoiceId = "DBI-INV-" + suffix;
        invoiceLineId = "DBI-LINE-" + suffix;
        disputeId = "DBI-DSP-" + suffix;

        insertTenant(supplierId, "GROUND_HANDLER");
        insertTenant(otherSupplierId, "GROUND_HANDLER");
        insertTenant(airlineId, "AIRLINE");
        jdbcTemplate.update("""
                insert into airports (iata_code, name, city, country, region, latitude, longitude)
                values ('QZZ', 'Integrity Airport', 'Integrity City', 'Testland', 'TEST', 0, 0)
                on conflict (iata_code) do nothing
                """);
        insertInvoice(invoiceId, "DRAFT", new BigDecimal("100.00"));
        insertInvoiceLine(invoiceLineId, invoiceId, new BigDecimal("100.00"));
        jdbcTemplate.update("update invoices set status = 'SENT' where id = ?", invoiceId);
        insertDispute(disputeId, invoiceId, supplierId, "OPEN", "MISCELLANEOUS",
                new BigDecimal("80.00"));
    }

    @Test
    void rejectsUnknownInvoiceAndDisputeVocabularies() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update invoices set status = 'UNKNOWN' where id = ?", invoiceId))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update disputes set category = 'UNKNOWN' where id = ?", disputeId))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into dispute_messages (
                    id, dispute_id, sender_tenant_id, sender_tenant_type,
                    sender_user_id, message, action
                ) values (?, ?, ?, 'AIRLINE', 'user-1', 'invalid action', 'UNKNOWN')
                """, "DBI-MSG-" + suffix, disputeId, airlineId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDisputePartyMismatchAndForeignTenantReferences() {
        assertThatThrownBy(() -> insertDispute(
                "DBI-BAD-DSP-" + suffix,
                invoiceId,
                otherSupplierId,
                "OPEN",
                "MISCELLANEOUS",
                new BigDecimal("10.00")))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("dispute parties and invoice identity");

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into dispute_messages (
                    id, dispute_id, sender_tenant_id, sender_tenant_type,
                    sender_user_id, message, action
                ) values (?, ?, 'MISSING-TENANT', 'AIRLINE', 'user-1', 'message', 'RESPOND')
                """, "DBI-BAD-MSG-" + suffix, disputeId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsLineItemFromAnotherInvoice() {
        String otherInvoiceId = "DBI-OTHER-INV-" + suffix;
        String otherLineId = "DBI-OTHER-LINE-" + suffix;
        insertInvoice(otherInvoiceId, "DRAFT", new BigDecimal("20.00"));
        insertInvoiceLine(otherLineId, otherInvoiceId, new BigDecimal("20.00"));

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into dispute_line_items (
                    id, dispute_id, line_item_id, charge_code, disputed_amount, reason
                ) values (?, ?, ?, 'PAX', 10.00, 'wrong invoice')
                """, "DBI-BAD-DLI-" + suffix, disputeId, otherLineId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("dispute line item must belong to the disputed invoice");
    }

    @Test
    void rejectsInvalidMonetaryRanges() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update disputes set credit_note_amount = disputed_amount + 1 where id = ?",
                disputeId))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update invoices set credit_note_amount = total_amount + 1 where id = ?",
                invoiceId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void serializesAndCapsDirectCreditNoteWrites() {
        insertCreditNote("DBI-CN-1-" + suffix, disputeId, new BigDecimal("60.00"));
        String secondDisputeId = "DBI-DSP-2-" + suffix;
        insertDispute(secondDisputeId, invoiceId, supplierId, "ACCEPTED", "MISCELLANEOUS",
                new BigDecimal("50.00"));

        assertThatThrownBy(() -> insertCreditNote(
                "DBI-CN-2-" + suffix, secondDisputeId, new BigDecimal("50.00")))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("total credit notes cannot exceed invoice total");
    }

    @Test
    void protectsDispatchedBillingContentButAllowsWorkflowMetadata() {
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update invoices set total_amount = 101.00 where id = ?", invoiceId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("dispatched invoice content is immutable");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update invoice_line_items set calculated_amount = 101.00 where id = ?",
                invoiceLineId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("dispatched invoice line content is immutable");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from invoice_line_items where id = ?", invoiceLineId))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "delete from invoices where id = ?", invoiceId))
                .isInstanceOf(DataIntegrityViolationException.class);

        int changed = jdbcTemplate.update("""
                update invoices
                set status = 'PAID', credit_note_amount = 10.00,
                    xml_file_key = 'invoices/test.xml', pdf_file_key = 'invoices/test.pdf'
                where id = ?
                """, invoiceId);
        int annotated = jdbcTemplate.update("""
                update invoice_line_items
                set disputed = true, dispute_category = 'MISCELLANEOUS',
                    dispute_comment = 'workflow metadata'
                where id = ?
                """, invoiceLineId);

        assertThat(changed).isEqualTo(1);
        assertThat(annotated).isEqualTo(1);
    }

    private void insertTenant(String id, String type) {
        jdbcTemplate.update(
                "insert into tenants (id, name, type, status) values (?, ?, ?, 'ACTIVE')",
                id, id, type);
    }

    private void insertInvoice(String id, String status, BigDecimal total) {
        jdbcTemplate.update("""
                insert into invoices (
                    id, invoice_number, tenant_id, airline_id, airport_code, currency,
                    issue_date, due_date, status, total_amount, credit_note_amount
                ) values (?, ?, ?, ?, 'QZZ', 'USD', current_date, current_date, ?, ?, 0)
                """, id, id, supplierId, airlineId, status, total);
    }

    private void insertInvoiceLine(String id, String parentInvoiceId, BigDecimal amount) {
        jdbcTemplate.update("""
                insert into invoice_line_items (
                    id, invoice_id, flight_date, flight_number, aircraft_reg, aircraft_type,
                    origin, destination, charge_code, service_name, formula_type,
                    quantity_drivers, calculated_amount
                ) values (?, ?, current_date, 'EK001', 'A6-DBI', 'A380', 'QZZ', 'QZZ',
                          'PAX', 'Passenger Handling', 'PF-01', '{}', ?)
                """, id, parentInvoiceId, amount);
    }

    private void insertDispute(
            String id,
            String parentInvoiceId,
            String disputeSupplierId,
            String status,
            String category,
            BigDecimal amount) {
        jdbcTemplate.update("""
                insert into disputes (
                    id, dispute_number, invoice_id, invoice_number, airline_id,
                    supplier_id, airport_code, status, category, disputed_amount,
                    credit_note_amount, initiator_comment
                ) values (?, ?, ?, ?, ?, ?, 'QZZ', ?, ?, ?, 0, 'integrity test')
                """, id, id, parentInvoiceId, parentInvoiceId, airlineId,
                disputeSupplierId, status, category, amount);
    }

    private void insertCreditNote(String id, String parentDisputeId, BigDecimal amount) {
        jdbcTemplate.update("""
                insert into credit_notes (
                    id, credit_note_number, dispute_id, invoice_id, original_invoice_number,
                    supplier_id, airline_id, airport_code, currency, amount, reason,
                    status, xml_file_key, created_by
                ) values (?, ?, ?, ?, ?, ?, ?, 'QZZ', 'USD', ?, 'integrity test',
                          'GENERATED', 'credit-notes/test.xml', 'test-user')
                """, id, id, parentDisputeId, invoiceId, invoiceId,
                supplierId, airlineId, amount);
    }
}
