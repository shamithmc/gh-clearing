package com.airline.pricing;

import com.airline.domain.FormulaType;
import com.airline.domain.ServiceConfiguration;
import com.airline.pricing.evaluators.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PricingEngineTest {

    private PricingEngine pricingEngine;

    private com.airline.repository.MtowRecordRepository mtowRecordRepository;

    @BeforeEach
    void setUp() {
        mtowRecordRepository = org.mockito.Mockito.mock(com.airline.repository.MtowRecordRepository.class);
        pricingEngine = new PricingEngine(List.of(
                new UnitRateEvaluator(),
                new UnitRateCompoundEvaluator(),
                new SlabBasedIncrementalEvaluator(),
                new SlabBasedAllUnitsEvaluator(),
                new TimeBasedEvaluator(),
                new DayBasedEvaluator(),
                new MtowBasedEvaluator(mtowRecordRepository)
        ));
    }

    @Test
    void testUnitRatePF01() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_01);
        config.setQuantityDriver("passengers");
        config.setRateDetails(Map.of("rate", "15.50"));

        Map<String, Object> inputs = Map.of("passengers", 100);
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        assertEquals(new BigDecimal("1550.00"), charge);
    }

    @Test
    void testMissingInputPF01() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_01);
        config.setQuantityDriver("passengers");
        config.setRateDetails(Map.of("rate", "15.50"));

        Map<String, Object> inputs = Map.of("wrongInput", 100);
        
        PricingEvaluationException exception = assertThrows(PricingEvaluationException.class, () -> 
            pricingEngine.calculateCharge(config, inputs)
        );
        assertTrue(exception.getCause() instanceof IllegalArgumentException);
    }

    @Test
    void testUnitRateCompoundPF02() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_02);
        config.setQuantityDriver("days,bags");
        config.setRateDetails(Map.of("rate", "2.00"));

        Map<String, Object> inputs = Map.of("days", 3, "bags", 50);
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        assertEquals(new BigDecimal("300.00"), charge); // 2 * 3 * 50 = 300
    }

    @Test
    void testSlabBasedIncrementalPF03() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_03);
        config.setQuantityDriver("weight");
        config.setRateDetails(Map.of("tiers", List.of(
                Map.of("upto", 100, "rate", 10),
                Map.of("upto", 200, "rate", 8),
                Map.of("rate", 5) // > 200
        )));

        // 100 * 10 + 100 * 8 + 50 * 5 = 1000 + 800 + 250 = 2050
        Map<String, Object> inputs = Map.of("weight", 250);
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        assertEquals(new BigDecimal("2050"), charge);
    }

    @Test
    void testSlabBasedAllUnitsPF04() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_04);
        config.setQuantityDriver("weight");
        config.setRateDetails(Map.of("tiers", List.of(
                Map.of("upto", 100, "rate", 10),
                Map.of("upto", 200, "rate", 8),
                Map.of("rate", 5) // > 200
        )));

        // 150 falls in the up to 200 tier -> rate 8 -> 150 * 8 = 1200
        Map<String, Object> inputs = Map.of("weight", 150);
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        assertEquals(new BigDecimal("1200"), charge);
    }

    @Test
    void testTimeBasedPF05() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_05);
        config.setQuantityDriver("turnarounds");
        config.setRateDetails(Map.of("timeBands", List.of(
                Map.of("start", "06:00", "end", "22:00", "rate", 500),
                Map.of("start", "22:00", "end", "06:00", "rate", 800) // overnight
        )));

        Map<String, Object> inputsDay = Map.of("flightTime", "14:30", "turnarounds", 1);
        BigDecimal chargeDay = pricingEngine.calculateCharge(config, inputsDay);
        assertEquals(new BigDecimal("500"), chargeDay);

        Map<String, Object> inputsNight = Map.of("flightTime", "02:15", "turnarounds", 1);
        BigDecimal chargeNight = pricingEngine.calculateCharge(config, inputsNight);
        assertEquals(new BigDecimal("800"), chargeNight);
    }

    @Test
    void testDayBasedPF06() {
        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_06);
        config.setQuantityDriver("services");
        config.setRateDetails(Map.of("dayRates", Map.of(
                "MONDAY", 100,
                "SUNDAY", 200
        )));

        Map<String, Object> inputs = Map.of("dayOfWeek", 7, "services", 2); // Sunday = 7
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        assertEquals(new BigDecimal("400"), charge);
    }

    @Test
    void testMtowBasedPF07() {
        com.airline.domain.MtowRecord record = com.airline.domain.MtowRecord.builder()
                .tailNumber("A6-EAA")
                .aircraftType("A380")
                .weight(new java.math.BigDecimal("380.0"))
                .build();
        org.mockito.Mockito.when(mtowRecordRepository.findById("A6-EAA")).thenReturn(java.util.Optional.of(record));

        ServiceConfiguration config = new ServiceConfiguration();
        config.setFormulaType(FormulaType.PF_07);
        config.setQuantityDriver("mtow"); // Though mostly driven by tail number
        config.setRateDetails(Map.of("rate", 20));

        Map<String, Object> inputs = Map.of("tailNumber", "A6-EAA");
        BigDecimal charge = pricingEngine.calculateCharge(config, inputs);
        
        // 380.0 * 20 = 7600.0
        assertEquals(new BigDecimal("7600.0"), charge);
    }
}
