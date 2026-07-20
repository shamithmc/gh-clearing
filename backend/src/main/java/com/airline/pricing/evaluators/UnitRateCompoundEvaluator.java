package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import com.airline.pricing.PricingValidation;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class UnitRateCompoundEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_02;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-02: Rate * Quantity_1 * Quantity_2
        Object rateObj = config.getRateDetails().get("rate");
        if (rateObj == null) {
            throw new IllegalArgumentException("PF-02 requires 'rate' in rateDetails");
        }
        BigDecimal rate = PricingValidation.nonNegativeDecimal(rateObj, "PF-02 rate");

        // For compound, quantityDriver contains multiple drivers separated by comma, e.g., "passengers,bags"
        String[] drivers = config.getQuantityDriver().split(",");
        if (drivers.length < 2) {
            throw new IllegalArgumentException("PF-02 requires at least two comma-separated drivers");
        }

        BigDecimal total = rate;
        for (String driver : drivers) {
            String key = driver.trim();
            Object qtyObj = flightInputs.get(key);
            if (qtyObj == null) {
                throw new IllegalArgumentException("Missing flight input for driver: " + key);
            }
            BigDecimal quantity = PricingValidation.nonNegativeDecimal(qtyObj, "PF-02 quantity " + key);
            total = total.multiply(quantity);
        }

        return total;
    }
}
