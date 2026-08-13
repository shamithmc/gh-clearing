-- Relational ownership and closed vocabularies for invoice/dispute integrity.
UPDATE invoices SET credit_note_amount = 0 WHERE credit_note_amount IS NULL;
ALTER TABLE invoices
    ALTER COLUMN credit_note_amount SET DEFAULT 0,
    ALTER COLUMN credit_note_amount SET NOT NULL;

ALTER TABLE invoices
    ADD CONSTRAINT chk_invoices_status CHECK (status IN (
        'DRAFT', 'FINALIZED', 'APPROVED', 'MODIFICATION_REQUESTED',
        'SENT', 'PAID', 'DISPUTED'
    )),
    ADD CONSTRAINT chk_invoices_credit_note_amount CHECK (
        credit_note_amount >= 0
        AND credit_note_amount <= total_amount
    );

ALTER TABLE disputes
    ALTER COLUMN credit_note_amount SET DEFAULT 0,
    ALTER COLUMN credit_note_amount SET NOT NULL,
    ADD CONSTRAINT fk_disputes_airline FOREIGN KEY (airline_id) REFERENCES tenants(id),
    ADD CONSTRAINT fk_disputes_supplier FOREIGN KEY (supplier_id) REFERENCES tenants(id),
    ADD CONSTRAINT fk_disputes_airport FOREIGN KEY (airport_code) REFERENCES airports(iata_code),
    ADD CONSTRAINT chk_disputes_status CHECK (status IN (
        'OPEN', 'UNDER_REVIEW', 'RESPONDED', 'ACCEPTED', 'REJECTED', 'ESCALATED'
    )),
    ADD CONSTRAINT chk_disputes_category CHECK (category IN (
        'OPERATIONAL_DATA_MISMATCH',
        'CONTRACT_RATE_FORMULA_MISMATCH',
        'EXCHANGE_RATE_MISMATCH',
        'REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE',
        'MISCELLANEOUS'
    )),
    ADD CONSTRAINT chk_disputes_amounts CHECK (
        disputed_amount > 0
        AND credit_note_amount >= 0
        AND credit_note_amount <= disputed_amount
    );

ALTER TABLE dispute_line_items
    ADD CONSTRAINT fk_dispute_line_items_invoice_line
        FOREIGN KEY (line_item_id) REFERENCES invoice_line_items(id),
    ADD CONSTRAINT chk_dispute_line_items_amount CHECK (disputed_amount >= 0);

ALTER TABLE dispute_messages
    ADD CONSTRAINT fk_dispute_messages_sender_tenant
        FOREIGN KEY (sender_tenant_id) REFERENCES tenants(id),
    ADD CONSTRAINT chk_dispute_messages_sender_type CHECK (
        sender_tenant_type IN ('AIRLINE', 'GROUND_HANDLER')
    ),
    ADD CONSTRAINT chk_dispute_messages_action CHECK (
        action IS NULL OR action IN (
            'OPENED', 'ACKNOWLEDGE', 'RESPOND', 'ACCEPT', 'REJECT', 'ESCALATE'
        )
    );

-- A dispute must use the same supplier, airline, airport, number, and invoice
-- line ownership as the referenced invoice. Constraint triggers make this
-- deferrable so Hibernate may flush the invoice dispute markers first.
CREATE OR REPLACE FUNCTION enforce_dispute_invoice_identity()
RETURNS TRIGGER AS $$
DECLARE
    invoice_row invoices%ROWTYPE;
BEGIN
    SELECT * INTO invoice_row FROM invoices WHERE id = NEW.invoice_id;
    IF NOT FOUND
        OR invoice_row.tenant_id <> NEW.supplier_id
        OR invoice_row.airline_id <> NEW.airline_id
        OR invoice_row.airport_code <> NEW.airport_code
        OR invoice_row.invoice_number <> NEW.invoice_number THEN
        RAISE EXCEPTION 'dispute parties and invoice identity must match the referenced invoice'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_dispute_invoice_identity
AFTER INSERT OR UPDATE OF invoice_id, invoice_number, supplier_id, airline_id, airport_code
ON disputes DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_dispute_invoice_identity();

CREATE OR REPLACE FUNCTION enforce_dispute_line_invoice_identity()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM disputes dispute
        JOIN invoice_line_items line ON line.id = NEW.line_item_id
        WHERE dispute.id = NEW.dispute_id
          AND line.invoice_id = dispute.invoice_id
    ) THEN
        RAISE EXCEPTION 'dispute line item must belong to the disputed invoice'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_dispute_line_invoice_identity
AFTER INSERT OR UPDATE OF dispute_id, line_item_id
ON dispute_line_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_dispute_line_invoice_identity();

-- Direct credit-note writes serialize on the invoice and cannot exceed its
-- value or cross its tenant/party/currency identity.
CREATE OR REPLACE FUNCTION enforce_credit_note_invoice_cap()
RETURNS TRIGGER AS $$
DECLARE
    invoice_row invoices%ROWTYPE;
    issued_total DECIMAL(15, 2);
BEGIN
    SELECT * INTO invoice_row FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
    IF NOT FOUND
        OR invoice_row.tenant_id <> NEW.supplier_id
        OR invoice_row.airline_id <> NEW.airline_id
        OR invoice_row.airport_code <> NEW.airport_code
        OR invoice_row.invoice_number <> NEW.original_invoice_number
        OR invoice_row.currency <> NEW.currency THEN
        RAISE EXCEPTION 'credit note identity must match the referenced invoice'
            USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO issued_total
    FROM credit_notes
    WHERE invoice_id = NEW.invoice_id
      AND id <> NEW.id;

    IF issued_total + NEW.amount > invoice_row.total_amount THEN
        RAISE EXCEPTION 'total credit notes cannot exceed invoice total'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credit_note_invoice_cap
BEFORE INSERT OR UPDATE OF invoice_id, supplier_id, airline_id, airport_code,
    original_invoice_number, currency, amount
ON credit_notes FOR EACH ROW EXECUTE FUNCTION enforce_credit_note_invoice_cap();

-- Once dispatched, invoice billing content cannot be changed or deleted.
-- Workflow state, document metadata, credit totals, and comments remain mutable.
CREATE OR REPLACE FUNCTION protect_dispatched_invoice_content()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('SENT', 'PAID', 'DISPUTED') THEN
            RAISE EXCEPTION 'dispatched invoice content is immutable'
                USING ERRCODE = '23514';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status IN ('SENT', 'PAID', 'DISPUTED') AND (
        NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.airline_id IS DISTINCT FROM OLD.airline_id
        OR NEW.airport_code IS DISTINCT FROM OLD.airport_code
        OR NEW.currency IS DISTINCT FROM OLD.currency
        OR NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate
        OR NEW.exchange_rate_source IS DISTINCT FROM OLD.exchange_rate_source
        OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
        OR NEW.due_date IS DISTINCT FROM OLD.due_date
        OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    ) THEN
        RAISE EXCEPTION 'dispatched invoice content is immutable'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_dispatched_invoice_content
BEFORE UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION protect_dispatched_invoice_content();

CREATE OR REPLACE FUNCTION protect_dispatched_invoice_lines()
RETURNS TRIGGER AS $$
DECLARE
    parent_invoice_id VARCHAR(50);
    parent_status VARCHAR(30);
BEGIN
    parent_invoice_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
    SELECT status INTO parent_status FROM invoices WHERE id = parent_invoice_id;

    IF parent_status IN ('SENT', 'PAID', 'DISPUTED') THEN
        IF TG_OP IN ('INSERT', 'DELETE') OR (
            NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
            OR NEW.flight_date IS DISTINCT FROM OLD.flight_date
            OR NEW.flight_number IS DISTINCT FROM OLD.flight_number
            OR NEW.aircraft_reg IS DISTINCT FROM OLD.aircraft_reg
            OR NEW.aircraft_type IS DISTINCT FROM OLD.aircraft_type
            OR NEW.origin IS DISTINCT FROM OLD.origin
            OR NEW.destination IS DISTINCT FROM OLD.destination
            OR NEW.charge_code IS DISTINCT FROM OLD.charge_code
            OR NEW.service_name IS DISTINCT FROM OLD.service_name
            OR NEW.formula_type IS DISTINCT FROM OLD.formula_type
            OR NEW.quantity_drivers IS DISTINCT FROM OLD.quantity_drivers
            OR NEW.calculated_amount IS DISTINCT FROM OLD.calculated_amount
            OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
        ) THEN
            RAISE EXCEPTION 'dispatched invoice line content is immutable'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_dispatched_invoice_lines
BEFORE INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION protect_dispatched_invoice_lines();
