ALTER TABLE operational_flights
    ALTER COLUMN tail_id TYPE VARCHAR(20),
    ADD COLUMN airline_id VARCHAR(50),
    ADD COLUMN airport_code VARCHAR(3),
    ADD COLUMN aircraft_type VARCHAR(50),
    ADD CONSTRAINT fk_operational_flights_airline
        FOREIGN KEY (airline_id) REFERENCES tenants(id),
    ADD CONSTRAINT fk_operational_flights_airport
        FOREIGN KEY (airport_code) REFERENCES airports(iata_code),
    ADD CONSTRAINT chk_operational_flights_airline_required
        CHECK (airline_id IS NOT NULL) NOT VALID,
    ADD CONSTRAINT chk_operational_flights_airport_required
        CHECK (airport_code IS NOT NULL) NOT VALID;

CREATE INDEX idx_operational_flights_pending
    ON operational_flights (tenant_id, flight_date, airline_id, airport_code);

ALTER TABLE invoice_line_items
    ADD COLUMN operational_flight_id VARCHAR(50),
    ADD CONSTRAINT fk_invoice_line_operational_flight
        FOREIGN KEY (operational_flight_id) REFERENCES operational_flights(id);

CREATE UNIQUE INDEX uq_invoice_line_operational_flight_charge
    ON invoice_line_items (operational_flight_id, charge_code)
    WHERE operational_flight_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_invoice_line_operational_identity()
RETURNS TRIGGER AS $$
DECLARE
    invoice_row invoices%ROWTYPE;
    flight_row operational_flights%ROWTYPE;
BEGIN
    IF NEW.operational_flight_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO invoice_row FROM invoices WHERE id = NEW.invoice_id;
    SELECT * INTO flight_row FROM operational_flights WHERE id = NEW.operational_flight_id;
    IF NOT FOUND
        OR invoice_row.tenant_id <> flight_row.tenant_id
        OR invoice_row.airline_id <> flight_row.airline_id
        OR invoice_row.airport_code <> flight_row.airport_code
        OR NEW.flight_date <> flight_row.flight_date
        OR upper(NEW.flight_number) <> upper(flight_row.flight_number)
        OR upper(NEW.aircraft_reg) <> upper(flight_row.tail_id) THEN
        RAISE EXCEPTION 'invoice line identity must match its operational flight'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_invoice_line_operational_identity
AFTER INSERT OR UPDATE OF invoice_id, operational_flight_id, flight_date,
    flight_number, aircraft_reg
ON invoice_line_items DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_invoice_line_operational_identity();
