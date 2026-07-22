ALTER TABLE rfp_proposals
    ADD COLUMN IF NOT EXISTS decided_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE rfps
    ADD COLUMN IF NOT EXISTS awarded_proposal_id VARCHAR(50);

ALTER TABLE rfps
    ADD CONSTRAINT fk_rfps_awarded_proposal
    FOREIGN KEY (awarded_proposal_id) REFERENCES rfp_proposals(id);

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS source_rfp_id VARCHAR(50);

ALTER TABLE contracts
    ADD CONSTRAINT fk_contracts_source_rfp
    FOREIGN KEY (source_rfp_id) REFERENCES rfps(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_source_rfp
    ON contracts (source_rfp_id)
    WHERE source_rfp_id IS NOT NULL;
