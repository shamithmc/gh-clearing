-- V26 left dispute message actions unconstrained, and an earlier staging seed
-- used creation/status names instead of the actions emitted by DisputeService.
-- Run before versioned migrations so an existing V29 database can satisfy the
-- closed vocabulary introduced by V30 without changing V30's checksum.
DO $$
BEGIN
    IF to_regclass('dispute_messages') IS NOT NULL THEN
        UPDATE dispute_messages
        SET action = CASE action
            WHEN 'CREATED' THEN 'OPENED'
            WHEN 'UNDER_REVIEW' THEN 'ACKNOWLEDGE'
            WHEN 'RESPONDED' THEN 'RESPOND'
            WHEN 'ACCEPTED' THEN 'ACCEPT'
            WHEN 'REJECTED' THEN 'REJECT'
            WHEN 'ESCALATED' THEN 'ESCALATE'
            ELSE action
        END
        WHERE action IN (
            'CREATED', 'UNDER_REVIEW', 'RESPONDED',
            'ACCEPTED', 'REJECTED', 'ESCALATED'
        );
    END IF;
END
$$;
