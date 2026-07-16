package com.airline.api;

import com.airline.domain.MtowRecord;
import com.airline.repository.MtowRecordRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reference-data/mtow")
public class MtowController {

    private final MtowRecordRepository mtowRecordRepository;

    public MtowController(MtowRecordRepository mtowRecordRepository) {
        this.mtowRecordRepository = mtowRecordRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MtowRecord createMtowRecord(@Valid @RequestBody MtowRecord record) {
        return mtowRecordRepository.save(record);
    }

    @GetMapping
    public List<MtowRecord> listMtowRecords() {
        return mtowRecordRepository.findAll();
    }

    @GetMapping("/{tailNumber}")
    public MtowRecord getMtowRecord(@PathVariable String tailNumber) {
        return mtowRecordRepository.findById(tailNumber)
                .orElseThrow(() -> new java.util.NoSuchElementException("MTOW record not found for tail number: " + tailNumber));
    }
}
