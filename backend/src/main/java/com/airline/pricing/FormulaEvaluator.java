package com.airline.pricing;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import java.math.BigDecimal;
import java.util.Map;

public interface FormulaEvaluator {
    
    FormulaType getSupportedType();
    
    /**
     * Evaluates the charge for a given service configuration and operational flight inputs.
     * @param config The service configuration (pricing rule).
     * @param flightInputs The actual operational data (quantities, weights, times).
     * @return The calculated charge amount.
     */
    BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs);
}
