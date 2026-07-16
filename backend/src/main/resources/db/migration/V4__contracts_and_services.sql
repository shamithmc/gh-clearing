-- V4__contracts_and_services.sql
-- Phase 2: Add foreign key constraints to existing contracts and services tables to link to reference data

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS fk_contracts_airport;
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_airport FOREIGN KEY (airport_code) REFERENCES airports(iata_code) ON DELETE CASCADE;

ALTER TABLE services DROP CONSTRAINT IF EXISTS fk_services_charge_code;
ALTER TABLE services ADD CONSTRAINT fk_services_charge_code FOREIGN KEY (charge_code) REFERENCES charge_codes(code) ON DELETE CASCADE;
