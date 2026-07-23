package com.airline.pricing;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class PricingEngine {

    private final Map<FormulaType, FormulaEvaluator> evaluators = new EnumMap<>(FormulaType.class);

    public PricingEngine(List<FormulaEvaluator> evaluatorList) {
        for (FormulaEvaluator evaluator : evaluatorList) {
            FormulaEvaluator duplicate = evaluators.putIfAbsent(evaluator.getSupportedType(), evaluator);
            if (duplicate != null) {
                throw new IllegalStateException("Duplicate evaluator for formula type: " + evaluator.getSupportedType());
            }
        }
    }

    public BigDecimal calculateCharge(ServiceConfiguration config, Map<String, Object> flightInputs) {
        String configId = config == null ? "<null>" : config.getId();
        try {
            if (config == null || config.getFormulaType() == null) {
                throw new IllegalArgumentException("Pricing configuration and formula type are required");
            }
            if (flightInputs == null) {
                throw new IllegalArgumentException("Flight inputs are required");
            }
            FormulaEvaluator evaluator = evaluators.get(config.getFormulaType());
            if (evaluator == null) {
                throw new UnsupportedOperationException("No evaluator found for formula type: " + config.getFormulaType());
            }
            BigDecimal charge = evaluator.evaluate(config, flightInputs);
            if (charge == null || charge.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException("Pricing calculation produced an invalid charge");
            }
            return charge;
        } catch (Exception e) {
            // Architecture Contract §4.1.3: The calculation MUST fail closed.
            throw new PricingEvaluationException("Pricing evaluation failed for config " + configId, e);
        }
    }
}
