-- V5__add_tax_code.sql
-- Phase 2: Add tax_code to services table as per Architecture Contract

ALTER TABLE services ADD COLUMN IF NOT EXISTS tax_code VARCHAR(20);
