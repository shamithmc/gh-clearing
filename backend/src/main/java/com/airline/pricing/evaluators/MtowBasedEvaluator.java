package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import com.airline.repository.MtowRecordRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class MtowBasedEvaluator implements FormulaEvaluator {

    private final MtowRecordRepository mtowRecordRepository;

    public MtowBasedEvaluator(MtowRecordRepository mtowRecordRepository) {
        this.mtowRecordRepository = mtowRecordRepository;
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
        
        String tailNumber = tailNumberObj.toString();
        
        // Lookup in database MTOW registry
        BigDecimal mtow = mtowRecordRepository.findById(tailNumber)
                .map(com.airline.domain.MtowRecord::getWeight)
                .orElse(null);
        
        if (mtow == null) {
            throw new IllegalStateException("MTOW lookup failed for tail number: " + tailNumber + ". No fallback available.");
        }
        
        Object rateObj = config.getRateDetails().get("rate");
        if (rateObj == null) {
            throw new IllegalArgumentException("PF-07 requires 'rate' in rateDetails");
        }
        BigDecimal rate = new BigDecimal(rateObj.toString());

        // We multiply MTOW (in metric tonnes usually) by the rate.
        return mtow.multiply(rate);
    }
}
