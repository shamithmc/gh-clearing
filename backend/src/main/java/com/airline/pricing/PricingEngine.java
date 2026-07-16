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
            evaluators.put(evaluator.getSupportedType(), evaluator);
        }
    }

    public BigDecimal calculateCharge(ServiceConfiguration config, Map<String, Object> flightInputs) {
        FormulaEvaluator evaluator = evaluators.get(config.getFormulaType());
        if (evaluator == null) {
            throw new UnsupportedOperationException("No evaluator found for formula type: " + config.getFormulaType());
        }
        
        try {
            return evaluator.evaluate(config, flightInputs);
        } catch (Exception e) {
            // Architecture Contract §4.1.3: The calculation MUST fail closed.
            throw new PricingEvaluationException("Pricing evaluation failed for config " + config.getId(), e);
        }
    }
}
