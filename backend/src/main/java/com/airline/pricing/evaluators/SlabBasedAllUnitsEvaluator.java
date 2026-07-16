package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
public class SlabBasedAllUnitsEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_04;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-04: Entire quantity is repriced at the tier rate triggered by the threshold
        
        String driverKey = config.getQuantityDriver();
        Object qtyObj = flightInputs.get(driverKey);
        if (qtyObj == null) {
            throw new IllegalArgumentException("Missing flight input for driver: " + driverKey);
        }
        BigDecimal totalQuantity = new BigDecimal(qtyObj.toString());
        
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) config.getRateDetails().get("tiers");
        if (tiers == null || tiers.isEmpty()) {
            throw new IllegalArgumentException("PF-04 requires 'tiers' in rateDetails");
        }

        BigDecimal applicableRate = null;

        for (Map<String, Object> tier : tiers) {
            BigDecimal rate = new BigDecimal(tier.get("rate").toString());
            Object uptoObj = tier.get("upto");
            
            if (uptoObj == null) {
                // Last tier (infinity)
                applicableRate = rate;
                break;
            } else {
                BigDecimal upto = new BigDecimal(uptoObj.toString());
                if (totalQuantity.compareTo(upto) <= 0) {
                    applicableRate = rate;
                    break;
                }
            }
        }

        if (applicableRate == null) {
            throw new IllegalStateException("Could not determine applicable tier for quantity: " + totalQuantity);
        }

        return totalQuantity.multiply(applicableRate);
    }
}
