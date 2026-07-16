package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
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
        BigDecimal totalQuantity = new BigDecimal(qtyObj.toString());
        
        List<Map<String, Object>> tiers = (List<Map<String, Object>>) config.getRateDetails().get("tiers");
        if (tiers == null || tiers.isEmpty()) {
            throw new IllegalArgumentException("PF-03 requires 'tiers' in rateDetails");
        }

        BigDecimal totalCharge = BigDecimal.ZERO;
        BigDecimal remainingQuantity = totalQuantity;
        BigDecimal previousUpto = BigDecimal.ZERO;

        for (Map<String, Object> tier : tiers) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) break;
            
            BigDecimal rate = new BigDecimal(tier.get("rate").toString());
            Object uptoObj = tier.get("upto");
            
            if (uptoObj == null) {
                // Last tier (infinity)
                totalCharge = totalCharge.add(remainingQuantity.multiply(rate));
                remainingQuantity = BigDecimal.ZERO;
                break;
            } else {
                BigDecimal upto = new BigDecimal(uptoObj.toString());
                BigDecimal bandSize = upto.subtract(previousUpto);
                
                BigDecimal qtyInBand = remainingQuantity.min(bandSize);
                totalCharge = totalCharge.add(qtyInBand.multiply(rate));
                
                remainingQuantity = remainingQuantity.subtract(qtyInBand);
                previousUpto = upto;
            }
        }

        return totalCharge;
    }
}
