package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import com.airline.pricing.PricingValidation;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

@Component
public class SlabBasedIncrementalEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_03;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-03: Tiered pricing per quantity band
        // rateDetails format: { "tiers": [ {"upto": 100, "rate": 10}, {"upto": 200, "rate": 8}, {"upto": null, "rate": 5} ] }
        
        String driverKey = config.getQuantityDriver();
        Object qtyObj = flightInputs.get(driverKey);
        if (qtyObj == null) {
            throw new IllegalArgumentException("Missing flight input for driver: " + driverKey);
        }
        BigDecimal totalQuantity = PricingValidation.nonNegativeDecimal(qtyObj, "PF-03 quantity " + driverKey);
        
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) config.getRateDetails().get("tiers");
        if (tiers == null || tiers.isEmpty()) {
            throw new IllegalArgumentException("PF-03 requires 'tiers' in rateDetails");
        }

        BigDecimal totalCharge = BigDecimal.ZERO;
        BigDecimal remainingQuantity = totalQuantity;
        BigDecimal previousUpto = BigDecimal.ZERO;

        for (Map<String, Object> tier : tiers) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) break;
            
            BigDecimal rate = PricingValidation.nonNegativeDecimal(tier.get("rate"), "PF-03 tier rate");
            Object uptoObj = tier.get("upto");
            
            if (uptoObj == null) {
                // Last tier (infinity)
                totalCharge = totalCharge.add(remainingQuantity.multiply(rate));
                remainingQuantity = BigDecimal.ZERO;
                break;
            } else {
                BigDecimal upto = PricingValidation.nonNegativeDecimal(uptoObj, "PF-03 tier threshold");
                if (upto.compareTo(previousUpto) <= 0) {
                    throw new IllegalArgumentException("PF-03 tier thresholds must be strictly increasing");
                }
                BigDecimal bandSize = upto.subtract(previousUpto);
                
                BigDecimal qtyInBand = remainingQuantity.min(bandSize);
                totalCharge = totalCharge.add(qtyInBand.multiply(rate));
                
                remainingQuantity = remainingQuantity.subtract(qtyInBand);
                previousUpto = upto;
            }
        }

        if (remainingQuantity.compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("PF-03 tiers do not cover the requested quantity");
        }
        return totalCharge;
    }
}
