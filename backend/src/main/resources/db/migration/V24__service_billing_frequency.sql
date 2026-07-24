-- Phase 8.4 AFR2: optional recurring schedule for contract service projections.
ALTER TABLE services
    ADD COLUMN billing_frequency VARCHAR(20);

ALTER TABLE services
    ADD CONSTRAINT chk_services_billing_frequency
        CHECK (billing_frequency IS NULL OR billing_frequency IN (
            'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'
        ));
