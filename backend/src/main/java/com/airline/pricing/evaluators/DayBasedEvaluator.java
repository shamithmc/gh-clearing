package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.Map;

@Component
public class DayBasedEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_06;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-06: Rate varies based on day-of-week
        Object dayOfWeekObj = flightInputs.get("dayOfWeek");
        if (dayOfWeekObj == null) {
            throw new IllegalArgumentException("PF-06 requires 'dayOfWeek' input (1-7, where 1 is Monday)");
        }
        
        int dayValue = Integer.parseInt(dayOfWeekObj.toString());
        DayOfWeek day = DayOfWeek.of(dayValue);
        
        Map<String, Object> dayRates = (Map<String, Object>) config.getRateDetails().get("dayRates");
        if (dayRates == null || dayRates.isEmpty()) {
            throw new IllegalArgumentException("PF-06 requires 'dayRates' map in rateDetails");
        }
        
        Object rateObj = dayRates.get(day.name());
        if (rateObj == null) {
            throw new IllegalStateException("No rate defined for day: " + day.name());
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
