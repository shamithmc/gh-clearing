package com.airline.pricing.evaluators;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.FormulaEvaluator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Component
public class TimeBasedEvaluator implements FormulaEvaluator {

    @Override
    public FormulaType getSupportedType() {
        return FormulaType.PF_05;
    }

    @Override
    public BigDecimal evaluate(ServiceConfiguration config, Map<String, Object> flightInputs) {
        // PF-05: Rate varies dynamically based on local time-of-day
        // Input requires flightTime in format HH:mm
        Object flightTimeObj = flightInputs.get("flightTime");
        if (flightTimeObj == null) {
            throw new IllegalArgumentException("PF-05 requires 'flightTime' input (HH:mm)");
        }
        LocalTime flightTime = LocalTime.parse(flightTimeObj.toString());

        List<Map<String, Object>> timeBands = (List<Map<String, Object>>) config.getRateDetails().get("timeBands");
        if (timeBands == null || timeBands.isEmpty()) {
            throw new IllegalArgumentException("PF-05 requires 'timeBands' in rateDetails");
        }

        BigDecimal applicableRate = null;

        for (Map<String, Object> band : timeBands) {
            LocalTime start = LocalTime.parse(band.get("start").toString());
            LocalTime end = LocalTime.parse(band.get("end").toString());
            
            // Handle overnight bands (e.g. 22:00 to 06:00)
            boolean isOvernight = end.isBefore(start);
            boolean inBand;
            
            if (isOvernight) {
                inBand = !flightTime.isBefore(start) || !flightTime.isAfter(end);
            } else {
                inBand = !flightTime.isBefore(start) && flightTime.isBefore(end);
            }
            
            if (inBand) {
                applicableRate = new BigDecimal(band.get("rate").toString());
                break;
            }
        }

        if (applicableRate == null) {
            throw new IllegalStateException("No applicable time band found for flight time: " + flightTime);
        }

        String driverKey = config.getQuantityDriver();
        Object qtyObj = flightInputs.get(driverKey);
        if (qtyObj == null) {
            throw new IllegalArgumentException("Missing flight input for driver: " + driverKey);
        }
        BigDecimal quantity = new BigDecimal(qtyObj.toString());

        return applicableRate.multiply(quantity);
    }
}
