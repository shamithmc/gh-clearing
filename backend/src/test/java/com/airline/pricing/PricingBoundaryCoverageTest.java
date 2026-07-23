package com.airline.pricing;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.evaluators.DayBasedEvaluator;
import com.airline.pricing.evaluators.SlabBasedAllUnitsEvaluator;
import com.airline.pricing.evaluators.SlabBasedIncrementalEvaluator;
import com.airline.pricing.evaluators.TimeBasedEvaluator;
import com.airline.pricing.evaluators.UnitRateCompoundEvaluator;
import com.airline.pricing.evaluators.UnitRateEvaluator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;

class PricingBoundaryCoverageTest {

    @Test
    void engineRejectsInvalidConfigurationAndEvaluatorResults() {
        PricingEngine emptyEngine = new PricingEngine(List.of());
        ServiceConfiguration config = config(
                FormulaType.PF_01, "quantity", Map.of("rate", 1));

        assertThrows(PricingEvaluationException.class,
                () -> emptyEngine.calculateCharge(null, Map.of()));
        assertThrows(PricingEvaluationException.class,
                () -> emptyEngine.calculateCharge(config, null));
        assertThrows(PricingEvaluationException.class,
                () -> emptyEngine.calculateCharge(config, Map.of()));

        FormulaEvaluator negative = evaluatorReturning(new BigDecimal("-1"));
        PricingEngine negativeEngine = new PricingEngine(List.of(negative));
        assertThrows(PricingEvaluationException.class,
                () -> negativeEngine.calculateCharge(config, Map.of()));

        FormulaEvaluator nullResult = evaluatorReturning(null);
        PricingEngine nullEngine = new PricingEngine(List.of(nullResult));
        assertThrows(PricingEvaluationException.class,
                () -> nullEngine.calculateCharge(config, Map.of()));

        assertThrows(IllegalStateException.class,
                () -> new PricingEngine(List.of(negative, nullResult)));
    }

    @Test
    void numericValidationRejectsMissingInvalidAndNegativeValues() {
        assertThrows(IllegalArgumentException.class,
                () -> PricingValidation.nonNegativeDecimal(null, "value"));
        assertThrows(IllegalArgumentException.class,
                () -> PricingValidation.nonNegativeDecimal("invalid", "value"));
        assertThrows(IllegalArgumentException.class,
                () -> PricingValidation.nonNegativeDecimal("-0.01", "value"));
    }

    @Test
    void unitAndCompoundEvaluatorsRejectIncompleteInputs() {
        UnitRateEvaluator unit = new UnitRateEvaluator();
        assertThrows(IllegalArgumentException.class,
                () -> unit.evaluate(
                        config(FormulaType.PF_01, "units", Map.of()),
                        Map.of("units", 1)));
        assertThrows(IllegalArgumentException.class,
                () -> unit.evaluate(
                        config(FormulaType.PF_01, "units", Map.of("rate", 1)),
                        Map.of()));

        UnitRateCompoundEvaluator compound = new UnitRateCompoundEvaluator();
        assertThrows(IllegalArgumentException.class,
                () -> compound.evaluate(
                        config(FormulaType.PF_02, "a,b", Map.of()), Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> compound.evaluate(
                        config(FormulaType.PF_02, "a", Map.of("rate", 1)),
                        Map.of("a", 1)));
        assertThrows(IllegalArgumentException.class,
                () -> compound.evaluate(
                        config(FormulaType.PF_02, "a,b", Map.of("rate", 1)),
                        Map.of("a", 1)));
    }

    @Test
    void dayAndTimeEvaluatorsRejectUnpricedInputs() {
        DayBasedEvaluator day = new DayBasedEvaluator();
        ServiceConfiguration noDayRates = config(
                FormulaType.PF_06, "services", Map.of());
        assertThrows(IllegalArgumentException.class,
                () -> day.evaluate(noDayRates, Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> day.evaluate(noDayRates, Map.of("dayOfWeek", 1)));
        ServiceConfiguration missingMonday = config(
                FormulaType.PF_06, "services",
                Map.of("dayRates", Map.of("SUNDAY", 2)));
        assertThrows(IllegalStateException.class,
                () -> day.evaluate(missingMonday, Map.of("dayOfWeek", 1)));
        ServiceConfiguration monday = config(
                FormulaType.PF_06, "services",
                Map.of("dayRates", Map.of("MONDAY", 2)));
        assertThrows(IllegalArgumentException.class,
                () -> day.evaluate(monday, Map.of("dayOfWeek", 1)));

        TimeBasedEvaluator time = new TimeBasedEvaluator();
        ServiceConfiguration noBands = config(
                FormulaType.PF_05, "services", Map.of());
        assertThrows(IllegalArgumentException.class,
                () -> time.evaluate(noBands, Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> time.evaluate(noBands, Map.of("flightTime", "10:00")));
        ServiceConfiguration uncovered = config(
                FormulaType.PF_05, "services",
                Map.of("timeBands", List.of(
                        Map.of("start", "12:00", "end", "13:00", "rate", 2))));
        assertThrows(IllegalStateException.class,
                () -> time.evaluate(uncovered, Map.of("flightTime", "10:00")));
        ServiceConfiguration covered = config(
                FormulaType.PF_05, "services",
                Map.of("timeBands", List.of(
                        Map.of("start", "09:00", "end", "11:00", "rate", 2))));
        assertThrows(IllegalArgumentException.class,
                () -> time.evaluate(covered, Map.of("flightTime", "10:00")));
    }

    @Test
    void slabEvaluatorsRejectMissingAndMalformedTiers() {
        SlabBasedIncrementalEvaluator incremental =
                new SlabBasedIncrementalEvaluator();
        assertThrows(IllegalArgumentException.class,
                () -> incremental.evaluate(
                        config(FormulaType.PF_03, "weight", Map.of()),
                        Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> incremental.evaluate(
                        config(FormulaType.PF_03, "weight", Map.of()),
                        Map.of("weight", 1)));

        SlabBasedAllUnitsEvaluator allUnits = new SlabBasedAllUnitsEvaluator();
        assertThrows(IllegalArgumentException.class,
                () -> allUnits.evaluate(
                        config(FormulaType.PF_04, "weight", Map.of()),
                        Map.of()));
        assertThrows(IllegalArgumentException.class,
                () -> allUnits.evaluate(
                        config(FormulaType.PF_04, "weight", Map.of()),
                        Map.of("weight", 1)));
        ServiceConfiguration terminalNotLast = config(
                FormulaType.PF_04, "weight",
                Map.of("tiers", List.of(
                        Map.of("rate", 5),
                        Map.of("upto", 100, "rate", 4))));
        assertThrows(IllegalArgumentException.class,
                () -> allUnits.evaluate(terminalNotLast, Map.of("weight", 150)));
    }

    private static ServiceConfiguration config(
            FormulaType type, String driver, Map<String, Object> rates) {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setId("coverage");
        config.setFormulaType(type);
        config.setQuantityDriver(driver);
        config.setRateDetails(rates);
        return config;
    }

    private static FormulaEvaluator evaluatorReturning(BigDecimal value) {
        return new FormulaEvaluator() {
            @Override
            public FormulaType getSupportedType() {
                return FormulaType.PF_01;
            }

            @Override
            public BigDecimal evaluate(
                    ServiceConfiguration config,
                    Map<String, Object> flightInputs) {
                return value;
            }
        };
    }
}
