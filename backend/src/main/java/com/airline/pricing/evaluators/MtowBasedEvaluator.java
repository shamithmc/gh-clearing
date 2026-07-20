package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import com.airline.repository.MtowRecordRepository;
import com.airline.repository.AircraftTypeMtowDefaultRepository;
import com.airline.pricing.PricingValidation;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class MtowBasedEvaluator implements FormulaEvaluator {

    private final MtowRecordRepository mtowRecordRepository;
    private final AircraftTypeMtowDefaultRepository aircraftTypeMtowDefaultRepository;

    public MtowBasedEvaluator(MtowRecordRepository mtowRecordRepository,
                              AircraftTypeMtowDefaultRepository aircraftTypeMtowDefaultRepository) {
        this.mtowRecordRepository = mtowRecordRepository;
        this.aircraftTypeMtowDefaultRepository = aircraftTypeMtowDefaultRepository;
    }

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_07;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-07: MTOW-based calculation.
        Object tailNumberObj = flightInputs.get("tailNumber");
        if (tailNumberObj == null) {
            throw new IllegalArgumentException("PF-07 requires 'tailNumber' input");
        }
        
        String tailNumber = tailNumberObj.toString().trim().toUpperCase(java.util.Locale.ROOT);
        if (tailNumber.isEmpty()) {
            throw new IllegalArgumentException("PF-07 requires a non-blank 'tailNumber' input");
        }
        
        // Lookup in database MTOW registry
        BigDecimal mtow = mtowRecordRepository.findById(tailNumber)
                .map(com.airline.domain.MtowRecord::getWeight)
                .orElse(null);

        if (mtow == null) {
            Object aircraftTypeObj = flightInputs.get("aircraftType");
            if (aircraftTypeObj != null && !aircraftTypeObj.toString().isBlank()) {
                String aircraftType = aircraftTypeObj.toString().trim().toUpperCase(java.util.Locale.ROOT);
                mtow = aircraftTypeMtowDefaultRepository.findById(aircraftType)
                        .map(com.airline.domain.AircraftTypeMtowDefault::getWeight)
                        .orElse(null);
            }
        }

        if (mtow == null) {
            throw new IllegalStateException("MTOW lookup failed for tail number: " + tailNumber
                    + ". No aircraft-type fallback available.");
        }
        mtow = PricingValidation.nonNegativeDecimal(mtow, "PF-07 MTOW weight");
        
        Object rateObj = config.getRateDetails().get("rate");
        if (rateObj == null) {
            throw new IllegalArgumentException("PF-07 requires 'rate' in rateDetails");
        }
        BigDecimal rate = PricingValidation.nonNegativeDecimal(rateObj, "PF-07 rate");

        // We multiply MTOW (in metric tonnes usually) by the rate.
        return mtow.multiply(rate);
    }
}
