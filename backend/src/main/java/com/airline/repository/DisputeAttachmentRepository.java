package com.airline.repository;

import com.airline.domain.DisputeAttachment;

import java.util.List;
import java.util.Optional;

public interface DisputeAttachmentRepository extends TenantScopedRepository<DisputeAttachment, String> {

    List<DisputeAttachment> findAllByDisputeIdOrderByUploadedAtAsc(String disputeId);

    Optional<DisputeAttachment> findByIdAndDisputeId(String id, String disputeId);
}
