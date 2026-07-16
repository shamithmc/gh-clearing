package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class MtowBasedEvaluator implements FormulaEvaluator {

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
        
        // TODO (Phase 2.8): Call actual MTOW registry here.
        // For now, we use a simple stub implementation.
        BigDecimal mtow = stubMtowLookup(tailNumber);
        
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
    
    private BigDecimal stubMtowLookup(String tailNumber) {
        // Stub: known tail numbers
        if ("N12345".equals(tailNumber)) {
            return new BigDecimal("79.0"); // e.g., B737
        } else if ("A6-EAA".equals(tailNumber)) {
            return new BigDecimal("380.0"); // e.g., A380
        }
        return null;
    }
}
