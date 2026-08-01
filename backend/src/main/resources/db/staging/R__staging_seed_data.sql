-- Staging-only demo dataset. Loaded through application-staging.yml, never by the
-- default or production Flyway configuration. IDs are deterministic so this
-- repeatable migration can safely refresh date-relative records.

-- Personas and supplier configuration -------------------------------------------------
INSERT INTO tenants (id, name, type, status) VALUES
    ('DNATA', 'dnata Airport Operations', 'GROUND_HANDLER', 'ACTIVE'),
    ('BA', 'British Airways', 'AIRLINE', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, type = EXCLUDED.type, status = EXCLUDED.status;

INSERT INTO users (id, tenant_id, username, email, roles) VALUES
    ('stg-user-swissport', 'SWISSPORT', 'swissport.manager', 'swissport.manager@staging.example', 'ADMIN,CONTRACT_MANAGER,INVOICE_MANAGER'),
    ('stg-user-swissport-scoped', 'SWISSPORT', 'swissport.dxb', 'swissport.dxb@staging.example', 'CONTRACT_VIEWER,INVOICE_VIEWER'),
    ('stg-user-ek', 'EK', 'emirates.manager', 'emirates.manager@staging.example', 'ADMIN,CONTRACT_MANAGER,INVOICE_MANAGER'),
    ('stg-user-ek-scoped', 'EK', 'emirates.dxb', 'emirates.dxb@staging.example', 'CONTRACT_VIEWER,INVOICE_VIEWER'),
    ('stg-user-dnata', 'DNATA', 'dnata.manager', 'dnata.manager@staging.example', 'ADMIN,CONTRACT_MANAGER,INVOICE_MANAGER'),
    ('stg-user-ba', 'BA', 'ba.manager', 'ba.manager@staging.example', 'ADMIN,CONTRACT_MANAGER,INVOICE_MANAGER')
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id, username = EXCLUDED.username,
    email = EXCLUDED.email, roles = EXCLUDED.roles;

INSERT INTO user_airport_restrictions (user_id, airport_code) VALUES
    ('stg-user-swissport-scoped', 'DXB'), ('stg-user-ek-scoped', 'DXB')
ON CONFLICT DO NOTHING;
INSERT INTO user_airline_restrictions (user_id, airline_id) VALUES
    ('stg-user-swissport-scoped', 'EK')
ON CONFLICT DO NOTHING;
INSERT INTO user_charge_code_restrictions (user_id, charge_code) VALUES
    ('stg-user-swissport-scoped', 'RAMP_HANDLING'),
    ('stg-user-ek-scoped', 'RAMP_HANDLING')
ON CONFLICT DO NOTHING;

INSERT INTO supplier_configurations
    (tenant_id, email_ids, invoice_backdating_days, regional_classification)
VALUES
    ('SWISSPORT', 'billing.swissport@staging.example', 30, 'GLOBAL'),
    ('DNATA', 'billing.dnata@staging.example', 45, 'MIDDLE_EAST')
ON CONFLICT (tenant_id) DO UPDATE SET
    email_ids = EXCLUDED.email_ids,
    invoice_backdating_days = EXCLUDED.invoice_backdating_days,
    regional_classification = EXCLUDED.regional_classification;

INSERT INTO supplier_enabled_airlines (tenant_id, airline_id) VALUES
    ('SWISSPORT', 'EK'), ('SWISSPORT', 'BA'), ('DNATA', 'EK'), ('DNATA', 'BA')
ON CONFLICT DO NOTHING;
INSERT INTO supplier_enabled_airports (tenant_id, airport_code) VALUES
    ('SWISSPORT', 'DXB'), ('SWISSPORT', 'LHR'), ('SWISSPORT', 'SIN'),
    ('DNATA', 'DXB'), ('DNATA', 'LHR')
ON CONFLICT DO NOTHING;

-- Contracts and recurring services -----------------------------------------------------
WITH seed(id, tenant_id, airline_id, airport_code, start_offset, end_offset, status, currency) AS (
    VALUES
      ('STG-CON-DRAFT',      'SWISSPORT', 'EK', 'DXB', -10,  355, 'DRAFT',            'USD'),
      ('STG-CON-PENDING',    'SWISSPORT', 'EK', 'LHR', -20,  345, 'PENDING_APPROVAL', 'GBP'),
      ('STG-CON-APPROVED',   'SWISSPORT', 'EK', 'DXB', -90,   45, 'APPROVED',         'USD'),
      ('STG-CON-REVIEW',     'SWISSPORT', 'EK', 'SIN', -60,  305, 'REVIEW_REQUESTED', 'SGD'),
      ('STG-CON-EXPIRED',    'SWISSPORT', 'EK', 'CDG', -730, -30, 'EXPIRED',          'EUR'),
      ('STG-CON-BA',         'SWISSPORT', 'BA', 'LHR', -120, 245, 'APPROVED',         'GBP'),
      ('STG-CON-DNATA-EK',   'DNATA',     'EK', 'DXB', -75,  290, 'APPROVED',         'USD')
)
INSERT INTO contracts
    (id, tenant_id, airline_id, airport_code, start_date, end_date, status, currency, created_at)
SELECT id, tenant_id, airline_id, airport_code,
       CURRENT_DATE + start_offset, CURRENT_DATE + end_offset, status, currency,
       CURRENT_TIMESTAMP - INTERVAL '120 days'
FROM seed
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id, airline_id = EXCLUDED.airline_id,
    airport_code = EXCLUDED.airport_code, start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date, status = EXCLUDED.status, currency = EXCLUDED.currency;

INSERT INTO services
    (id, contract_id, charge_code, service_name, formula_type, rate_details,
     quantity_driver, uom, billing_frequency)
VALUES
    ('STG-SVC-DRAFT', 'STG-CON-DRAFT', 'CLEANING', 'Cabin turnaround cleaning', 'PF-01', '{"baseRate":450,"expectedAmount":450}', 'flightCount', 'FLIGHT', 'DAILY'),
    ('STG-SVC-PENDING', 'STG-CON-PENDING', 'PASSENGER_HANDLING', 'Passenger check-in and boarding', 'PF-02', '{"ratePerPassenger":4.5,"expectedAmount":1100}', 'passengerCount', 'PASSENGER', 'WEEKLY'),
    ('STG-SVC-APPROVED-RAMP', 'STG-CON-APPROVED', 'RAMP_HANDLING', 'A380 ramp handling', 'PF-03', '{"baseRate":3200,"expectedAmount":3200}', 'mtow', 'FLIGHT', 'MONTHLY'),
    ('STG-SVC-APPROVED-BAG', 'STG-CON-APPROVED', 'BAGGAGE', 'Baggage handling', 'PF-04', '{"ratePerBag":2.75,"expectedAmount":1850}', 'bagCount', 'BAG', 'DAILY'),
    ('STG-SVC-REVIEW', 'STG-CON-REVIEW', 'CARGO_HANDLING', 'Cargo warehouse handling', 'PF-05', '{"ratePerKg":0.35,"expectedAmount":2400}', 'cargoWeight', 'KG', 'QUARTERLY'),
    ('STG-SVC-EXPIRED', 'STG-CON-EXPIRED', 'DEICING', 'Aircraft de-icing', 'PF-06', '{"baseRate":1700,"expectedAmount":1700}', 'applicationCount', 'APPLICATION', 'MONTHLY'),
    ('STG-SVC-BA', 'STG-CON-BA', 'CLEANING', 'Long-haul deep cleaning', 'PF-07', '{"baseRate":900,"expectedAmount":900}', 'flightCount', 'FLIGHT', 'WEEKLY'),
    ('STG-SVC-DNATA', 'STG-CON-DNATA-EK', 'RAMP_HANDLING', 'A380 ramp handling', 'PF-03', '{"baseRate":3500,"expectedAmount":3500}', 'mtow', 'FLIGHT', 'MONTHLY')
ON CONFLICT (id) DO UPDATE SET
    contract_id = EXCLUDED.contract_id, charge_code = EXCLUDED.charge_code,
    service_name = EXCLUDED.service_name, formula_type = EXCLUDED.formula_type,
    rate_details = EXCLUDED.rate_details, quantity_driver = EXCLUDED.quantity_driver,
    uom = EXCLUDED.uom, billing_frequency = EXCLUDED.billing_frequency;

INSERT INTO contract_review_requests
    (id, contract_id, tenant_id, airline_id, comment, requested_by, created_at)
VALUES
    ('STG-CRR-001', 'STG-CON-REVIEW', 'SWISSPORT', 'EK', 'Please confirm the revised cargo-volume assumptions and quarterly minimum.', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('STG-CRR-002', 'STG-CON-PENDING', 'SWISSPORT', 'EK', 'Please provide final staffing and passenger-volume tiers before approval.', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
    comment = EXCLUDED.comment, requested_by = EXCLUDED.requested_by,
    created_at = EXCLUDED.created_at;

INSERT INTO contract_audit_logs (id, contract_id, action, user_id, timestamp)
SELECT 'STG-CAL-' || right(id, length(id) - 8), id,
       CASE status WHEN 'APPROVED' THEN 'APPROVED' WHEN 'REVIEW_REQUESTED' THEN 'REVIEW_REQUESTED' ELSE 'CREATED' END,
       CASE WHEN status IN ('APPROVED', 'REVIEW_REQUESTED') THEN 'stg-user-ek' ELSE 'stg-user-swissport' END,
       CURRENT_TIMESTAMP - INTERVAL '10 days'
FROM contracts WHERE id LIKE 'STG-CON-%'
ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, timestamp = EXCLUDED.timestamp;

-- Invoices: all supplier statuses plus airline-visible and benchmark records ------------
WITH seed(id, invoice_number, tenant_id, airline_id, airport_code, currency,
          issue_offset, due_offset, status, amount, comments) AS (
    VALUES
      ('STG-INV-DRAFT',     'STG-DRAFT-001',     'SWISSPORT', 'EK', 'DXB', 'USD',  -3,  27, 'DRAFT',                  1200.00, 'Draft invoice ready for review'),
      ('STG-INV-FINAL',     'STG-FINAL-001',     'SWISSPORT', 'EK', 'LHR', 'GBP', -12,  18, 'FINALIZED',             2100.00, 'Finalized and awaiting approval'),
      ('STG-INV-APPROVED',  'STG-APPROVED-001',  'SWISSPORT', 'EK', 'SIN', 'SGD', -18,  12, 'APPROVED',              3300.00, 'Approved for delivery'),
      ('STG-INV-MODIFY',    'STG-MODIFY-001',    'SWISSPORT', 'EK', 'DXB', 'USD', -25,   5, 'MODIFICATION_REQUESTED', 1450.00, 'Airline requested supporting flight data'),
      ('STG-INV-SENT',      'STG-SENT-001',      'SWISSPORT', 'EK', 'DXB', 'USD', -40, -10, 'SENT',                  3200.00, 'Open receivable and benchmark sample'),
      ('STG-INV-PAID',      'STG-PAID-001',      'SWISSPORT', 'EK', 'DXB', 'USD', -75, -45, 'PAID',                  2850.00, 'Paid in full'),
      ('STG-INV-DISPUTED',  'STG-DISPUTED-001',  'SWISSPORT', 'EK', 'LHR', 'GBP', -55, -25, 'DISPUTED',              2400.00, 'Invoice-level dispute example'),
      ('STG-INV-DNATA',     'STG-DNATA-001',     'DNATA',     'EK', 'DXB', 'USD', -35,  -5, 'SENT',                  3500.00, 'Second supplier benchmark sample'),
      ('STG-INV-DSP-OPEN',  'STG-DSP-OPEN',      'SWISSPORT', 'EK', 'DXB', 'USD', -20,  10, 'DISPUTED',               800.00, 'Open dispute'),
      ('STG-INV-DSP-REVIEW','STG-DSP-REVIEW',    'SWISSPORT', 'EK', 'DXB', 'USD', -30,   0, 'DISPUTED',               900.00, 'Dispute under review'),
      ('STG-INV-DSP-RESP',  'STG-DSP-RESP',      'SWISSPORT', 'EK', 'SIN', 'SGD', -42, -12, 'DISPUTED',              1000.00, 'Supplier responded'),
      ('STG-INV-DSP-ACCEPT','STG-DSP-ACCEPT',    'SWISSPORT', 'EK', 'LHR', 'GBP', -65, -35, 'DISPUTED',              1100.00, 'Accepted dispute'),
      ('STG-INV-DSP-REJECT','STG-DSP-REJECT',    'SWISSPORT', 'EK', 'DXB', 'USD', -95, -65, 'DISPUTED',              1300.00, 'Rejected dispute'),
      ('STG-INV-DSP-ESC',   'STG-DSP-ESC',       'SWISSPORT', 'EK', 'CDG', 'EUR',-130,-100, 'DISPUTED',              1500.00, 'Escalated dispute')
)
INSERT INTO invoices
    (id, invoice_number, tenant_id, airline_id, airport_code, currency, exchange_rate,
     exchange_rate_source, issue_date, due_date, status, total_amount, created_at, comments,
     credit_note_amount)
SELECT id, invoice_number, tenant_id, airline_id, airport_code, currency, 1.0000,
       'STAGING_SEED', CURRENT_DATE + issue_offset, CURRENT_DATE + due_offset,
       status, amount, CURRENT_TIMESTAMP + (issue_offset || ' days')::interval, comments,
       CASE WHEN id = 'STG-INV-DSP-ACCEPT' THEN 275.00 ELSE 0.00 END
FROM seed
ON CONFLICT (id) DO UPDATE SET
    issue_date = EXCLUDED.issue_date, due_date = EXCLUDED.due_date,
    status = EXCLUDED.status, total_amount = EXCLUDED.total_amount,
    comments = EXCLUDED.comments, credit_note_amount = EXCLUDED.credit_note_amount;

INSERT INTO invoice_line_items
    (id, invoice_id, flight_date, flight_number, aircraft_reg, origin, destination,
     charge_code, service_name, formula_type, quantity_drivers, calculated_amount,
     contract_id, disputed, dispute_category, dispute_comment, aircraft_type)
SELECT 'STG-LINE-' || right(i.id, length(i.id) - 8), i.id, i.issue_date - 2,
       CASE WHEN i.tenant_id = 'DNATA' THEN 'EK204' ELSE 'EK202' END,
       CASE WHEN i.tenant_id = 'DNATA' THEN 'A6-EVN' ELSE 'A6-EVO' END,
       CASE WHEN i.airport_code = 'DXB' THEN 'LHR' ELSE 'DXB' END, i.airport_code,
       CASE WHEN i.airport_code = 'DXB' THEN 'RAMP_HANDLING' ELSE 'CLEANING' END,
       CASE WHEN i.airport_code = 'DXB' THEN 'A380 ramp handling' ELSE 'Aircraft cleaning' END,
       'PF-03', '{"flightCount":1,"mtow":575000}', i.total_amount,
       CASE WHEN i.tenant_id = 'DNATA' THEN 'STG-CON-DNATA-EK' ELSE 'STG-CON-APPROVED' END,
       (i.status = 'DISPUTED'),
       CASE WHEN i.status = 'DISPUTED' THEN 'OPERATIONAL_DATA_MISMATCH' ELSE NULL END,
       CASE WHEN i.status = 'DISPUTED' THEN 'Seeded workflow example' ELSE NULL END,
       'A380'
FROM invoices i WHERE i.id LIKE 'STG-INV-%'
ON CONFLICT (id) DO UPDATE SET
    flight_date = EXCLUDED.flight_date, calculated_amount = EXCLUDED.calculated_amount,
    disputed = EXCLUDED.disputed, dispute_category = EXCLUDED.dispute_category,
    dispute_comment = EXCLUDED.dispute_comment;

INSERT INTO invoice_audit_logs (id, invoice_id, action, user_id, timestamp, comments)
SELECT 'STG-IAL-' || right(id, length(id) - 8), id, status,
       CASE WHEN tenant_id = 'DNATA' THEN 'stg-user-dnata' ELSE 'stg-user-swissport' END,
       created_at, 'Staging workflow sample'
FROM invoices WHERE id LIKE 'STG-INV-%'
ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, timestamp = EXCLUDED.timestamp;

-- RFP lifecycle and supplier response statuses ----------------------------------------
INSERT INTO rfps
    (id, tenant_id, airline_id, airport_code, service_type, requirements,
     desired_start_date, desired_end_date, status, created_by, created_at)
VALUES
    ('STG-RFP-PUBLISHED', 'EK', 'EK', 'DXB', 'RAMP_HANDLING', 'A380 turnaround, pushback and baggage transfer coverage.', CURRENT_DATE + 60, CURRENT_DATE + 425, 'PUBLISHED', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    ('STG-RFP-CLOSED', 'EK', 'EK', 'LHR', 'CLEANING', 'Daily long-haul cabin cleaning with SLA reporting.', CURRENT_DATE + 90, CURRENT_DATE + 455, 'CLOSED', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '40 days'),
    ('STG-RFP-AWARDED', 'EK', 'EK', 'SIN', 'CARGO_HANDLING', 'Cargo warehouse and transfer operation for wide-body flights.', CURRENT_DATE + 30, CURRENT_DATE + 395, 'AWARDED', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '70 days'),
    ('STG-RFP-NOT-SUBMITTED', 'EK', 'EK', 'CDG', 'PASSENGER_HANDLING', 'Check-in, gate and disruption-support staffing.', CURRENT_DATE + 120, CURRENT_DATE + 485, 'PUBLISHED', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO UPDATE SET
    desired_start_date = EXCLUDED.desired_start_date,
    desired_end_date = EXCLUDED.desired_end_date, status = EXCLUDED.status;

INSERT INTO rfp_eligible_ground_handlers (rfp_id, ground_handler_id) VALUES
    ('STG-RFP-PUBLISHED', 'SWISSPORT'), ('STG-RFP-PUBLISHED', 'DNATA'),
    ('STG-RFP-CLOSED', 'SWISSPORT'), ('STG-RFP-AWARDED', 'SWISSPORT'),
    ('STG-RFP-AWARDED', 'DNATA'), ('STG-RFP-NOT-SUBMITTED', 'SWISSPORT')
ON CONFLICT DO NOTHING;

INSERT INTO rfp_proposals
    (id, rfp_id, tenant_id, proposed_rate, currency, terms, status,
     submitted_by, submitted_at, decided_by, decided_at)
VALUES
    ('STG-PROP-SUBMITTED', 'STG-RFP-PUBLISHED', 'SWISSPORT', 3150.00, 'USD', 'Rate per A380 turnaround; 98.5% SLA.', 'SUBMITTED', 'stg-user-swissport', CURRENT_TIMESTAMP - INTERVAL '4 days', NULL, NULL),
    ('STG-PROP-REJECTED', 'STG-RFP-CLOSED', 'SWISSPORT', 850.00, 'GBP', 'Rate per aircraft clean.', 'REJECTED', 'stg-user-swissport', CURRENT_TIMESTAMP - INTERVAL '35 days', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('STG-PROP-ACCEPTED', 'STG-RFP-AWARDED', 'SWISSPORT', 2250.00, 'SGD', 'Rate per cargo turnaround.', 'ACCEPTED', 'stg-user-swissport', CURRENT_TIMESTAMP - INTERVAL '60 days', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('STG-PROP-DNATA-REJECTED', 'STG-RFP-AWARDED', 'DNATA', 2400.00, 'SGD', 'Rate per cargo turnaround.', 'REJECTED', 'stg-user-dnata', CURRENT_TIMESTAMP - INTERVAL '58 days', 'stg-user-ek', CURRENT_TIMESTAMP - INTERVAL '45 days')
ON CONFLICT (id) DO UPDATE SET
    proposed_rate = EXCLUDED.proposed_rate, status = EXCLUDED.status,
    decided_by = EXCLUDED.decided_by, decided_at = EXCLUDED.decided_at;

UPDATE rfps SET awarded_proposal_id = 'STG-PROP-ACCEPTED' WHERE id = 'STG-RFP-AWARDED';

-- Marketplace --------------------------------------------------------------------------
INSERT INTO service_offerings
    (id, tenant_id, airport_code, service_type, description)
VALUES
    ('STG-OFFER-SW-DXB-RAMP', 'SWISSPORT', 'DXB', 'RAMP_HANDLING', '24/7 wide-body ramp handling, pushback and turnaround coordination.'),
    ('STG-OFFER-SW-LHR-CLEAN', 'SWISSPORT', 'LHR', 'CLEANING', 'Cabin turnaround and deep-clean services for long-haul fleets.'),
    ('STG-OFFER-SW-SIN-CARGO', 'SWISSPORT', 'SIN', 'CARGO_HANDLING', 'Cargo acceptance, warehouse, build-up and transfer handling.'),
    ('STG-OFFER-DN-DXB-RAMP', 'DNATA', 'DXB', 'RAMP_HANDLING', 'Integrated A380 ramp, baggage and load-control services.'),
    ('STG-OFFER-DN-LHR-PAX', 'DNATA', 'LHR', 'PASSENGER_HANDLING', 'Check-in, boarding and disruption passenger support.')
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, updated_at = CURRENT_TIMESTAMP;

-- Dispute lifecycle --------------------------------------------------------------------
WITH seed(id, dispute_number, invoice_id, status, category, amount, credit, comment, response, age_days) AS (
    VALUES
      ('STG-DSP-OPEN',   'DSP-STG-0001', 'STG-INV-DSP-OPEN',   'OPEN',         'OPERATIONAL_DATA_MISMATCH', 200.00,   0.00, 'Flight movement count differs from our station log.', NULL, 2),
      ('STG-DSP-REVIEW', 'DSP-STG-0002', 'STG-INV-DSP-REVIEW', 'UNDER_REVIEW', 'CONTRACT_RATE_FORMULA_MISMATCH', 225.00, 0.00, 'The applied rate tier does not match the contract.', 'Supplier finance is validating the rate tier.', 5),
      ('STG-DSP-RESP',   'DSP-STG-0003', 'STG-INV-DSP-RESP',   'RESPONDED',    'EXCHANGE_RATE_MISMATCH', 250.00, 0.00, 'Please verify the exchange-rate source.', 'The ECB reference rate and source are attached.', 9),
      ('STG-DSP-ACCEPT', 'DSP-STG-0004', 'STG-INV-DSP-ACCEPT', 'ACCEPTED',     'OPERATIONAL_DATA_MISMATCH', 275.00, 275.00, 'One turnaround was cancelled before arrival.', 'Accepted; a credit note will be issued.', 14),
      ('STG-DSP-REJECT', 'DSP-STG-0005', 'STG-INV-DSP-REJECT', 'REJECTED',     'REFERENCED_FLIGHT_DOES_NOT_BELONG_TO_THE_AIRLINE', 325.00, 0.00, 'The referenced flight appears unrelated.', 'Flight ownership was verified against the movement record.', 21),
      ('STG-DSP-ESC',    'DSP-STG-0006', 'STG-INV-DSP-ESC',    'ESCALATED',    'MISCELLANEOUS', 375.00, 0.00, 'Supporting documentation remains incomplete.', 'Escalated for commercial review.', 30)
)
INSERT INTO disputes
    (id, dispute_number, invoice_id, invoice_number, airline_id, supplier_id,
     airport_code, status, category, disputed_amount, credit_note_amount,
     initiator_comment, latest_response, created_at, updated_at)
SELECT s.id, s.dispute_number, s.invoice_id, i.invoice_number, i.airline_id, i.tenant_id,
       i.airport_code, s.status, s.category, s.amount, s.credit, s.comment, s.response,
       CURRENT_TIMESTAMP - (s.age_days || ' days')::interval,
       CURRENT_TIMESTAMP - ((s.age_days - 1) || ' days')::interval
FROM seed s JOIN invoices i ON i.id = s.invoice_id
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, category = EXCLUDED.category,
    disputed_amount = EXCLUDED.disputed_amount,
    credit_note_amount = EXCLUDED.credit_note_amount,
    latest_response = EXCLUDED.latest_response, updated_at = EXCLUDED.updated_at;

INSERT INTO dispute_line_items
    (id, dispute_id, line_item_id, charge_code, disputed_amount, reason)
SELECT 'STG-DLI-' || right(d.id, length(d.id) - 8), d.id,
       'STG-LINE-' || right(d.invoice_id, length(d.invoice_id) - 8),
       CASE WHEN d.airport_code = 'DXB' THEN 'RAMP_HANDLING' ELSE 'CLEANING' END,
       d.disputed_amount, d.initiator_comment
FROM disputes d WHERE d.id LIKE 'STG-DSP-%'
ON CONFLICT (id) DO UPDATE SET
    disputed_amount = EXCLUDED.disputed_amount, reason = EXCLUDED.reason;

INSERT INTO dispute_messages
    (id, dispute_id, sender_tenant_id, sender_tenant_type, sender_user_id,
     message, action, created_at)
SELECT 'STG-DMSG-A-' || right(id, length(id) - 8), id, airline_id, 'AIRLINE',
       'stg-user-ek', initiator_comment, 'CREATED', created_at
FROM disputes WHERE id LIKE 'STG-DSP-%'
ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message, created_at = EXCLUDED.created_at;

INSERT INTO dispute_messages
    (id, dispute_id, sender_tenant_id, sender_tenant_type, sender_user_id,
     message, action, created_at)
SELECT 'STG-DMSG-S-' || right(id, length(id) - 8), id, supplier_id, 'GROUND_HANDLER',
       'stg-user-swissport', latest_response, status, updated_at
FROM disputes WHERE id LIKE 'STG-DSP-%' AND latest_response IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    message = EXCLUDED.message, action = EXCLUDED.action, created_at = EXCLUDED.created_at;
