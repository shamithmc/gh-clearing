package com.airline.repository;

import java.math.BigDecimal;

/**
 * Database-aggregated market intelligence with no tenant identifiers or
 * individual supplier observations.
 */
public interface MarketIntelligenceAggregate {

    String getAirportCode();

    String getAirportName();

    String getRegion();

    String getServiceType();

    String getAircraftType();

    String getOperationType();

    String getCurrency();

    BigDecimal getAverageCost();

    Long getObservationCount();

    BigDecimal getAirlineAverageCost();

    Long getAirlineObservationCount();

    BigDecimal getLowerQuartile();

    BigDecimal getUpperQuartile();
}
