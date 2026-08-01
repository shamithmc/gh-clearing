package com.airline.api;

import com.airline.domain.CreditNote;
import com.airline.service.CreditNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credit-notes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('INVOICE_REVIEWER', 'DISPUTE_HANDLER', 'DISPUTE_APPROVER')")
public class CreditNoteController {
    private final CreditNoteService creditNoteService;

    @GetMapping
    public List<CreditNote> list() {
        return creditNoteService.listForCurrentTenant();
    }

    @GetMapping("/{id}")
    public CreditNote get(@PathVariable String id) {
        return creditNoteService.getForCurrentTenant(id);
    }

    @GetMapping("/{id}/xml")
    public ResponseEntity<byte[]> downloadXml(@PathVariable String id) {
        CreditNote note = creditNoteService.getForCurrentTenant(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"credit-note-" + note.getCreditNoteNumber() + ".xml\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(creditNoteService.loadXml(note));
    }
}
