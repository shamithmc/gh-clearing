package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import com.airline.pricing.PricingValidation;
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
        BigDecimal totalQuantity = PricingValidation.nonNegativeDecimal(qtyObj, "PF-04 quantity " + driverKey);
        
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) config.getRateDetails().get("tiers");
        if (tiers == null || tiers.isEmpty()) {
            throw new IllegalArgumentException("PF-04 requires 'tiers' in rateDetails");
        }

        BigDecimal applicableRate = null;
        BigDecimal previousUpto = BigDecimal.ZERO;
        boolean terminalTierSeen = false;

        for (int index = 0; index < tiers.size(); index++) {
            Map<String, Object> tier = tiers.get(index);
            BigDecimal rate = PricingValidation.nonNegativeDecimal(tier.get("rate"), "PF-04 tier rate");
            Object uptoObj = tier.get("upto");
            
            if (uptoObj == null) {
                if (index != tiers.size() - 1) {
                    throw new IllegalArgumentException("PF-04 terminal tier must be last");
                }
                terminalTierSeen = true;
                applicableRate = rate;
                break;
            } else {
                BigDecimal upto = PricingValidation.nonNegativeDecimal(uptoObj, "PF-04 tier threshold");
                if (upto.compareTo(previousUpto) <= 0) {
                    throw new IllegalArgumentException("PF-04 tier thresholds must be strictly increasing");
                }
                previousUpto = upto;
                if (totalQuantity.compareTo(upto) <= 0) {
                    applicableRate = rate;
                    break;
                }
            }
        }

        if (applicableRate == null || (totalQuantity.compareTo(previousUpto) > 0 && !terminalTierSeen)) {
            throw new IllegalStateException("Could not determine applicable tier for quantity: " + totalQuantity);
        }

        return totalQuantity.multiply(applicableRate);
    }
}
