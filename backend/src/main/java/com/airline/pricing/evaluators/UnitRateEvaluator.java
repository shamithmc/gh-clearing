package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class UnitRateEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_01;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-01: Rate * Quantity
        Object rateObj = config.getRateDetails().get("rate");
        if (rateObj == null) {
            throw new IllegalArgumentException("PF-01 requires 'rate' in rateDetails");
        }
        BigDecimal rate = new BigDecimal(rateObj.toString());

        String driverKey = config.getQuantityDriver();
        Object qtyObj = flightInputs.get(driverKey);
        if (qtyObj == null) {
            throw new IllegalArgumentException("Missing flight input for driver: " + driverKey);
        }
        BigDecimal quantity = new BigDecimal(qtyObj.toString());

        return rate.multiply(quantity);
    }
}
