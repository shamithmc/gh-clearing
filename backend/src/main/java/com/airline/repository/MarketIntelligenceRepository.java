package com.airline.repository;

import com.airline.domain.Invoice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Explicit anonymization boundary for cross-tenant market intelligence.
 * Tenant identifiers and individual market observations never leave this query.
 */
public interface MarketIntelligenceRepository extends Repository<Invoice, String> {

    @Query(value = """
            with observations as (
                select airport.iata_code as airport_code,
                       airport.name as airport_name,
                       airport.region as region,
                       line.charge_code as service_type,
                       upper(coalesce(nullif(trim(line.aircraft_type), ''), mtow.aircraft_type, 'UNKNOWN')) as aircraft_type,
                       case
                           when origin.country is null or destination.country is null then 'UNKNOWN'
                           when upper(origin.country) = upper(destination.country) then 'DOMESTIC'
                           else 'INTERNATIONAL'
                       end as operation_type,
                       invoice.currency as currency,
                       invoice.tenant_id as supplier_id,
                       invoice.airline_id as airline_id,
                       line.calculated_amount as amount
                from invoices invoice
                join invoice_line_items line on line.invoice_id = invoice.id
                join airports airport on airport.iata_code = invoice.airport_code
                left join mtow_records mtow on upper(mtow.tail_number) = upper(line.aircraft_reg)
                left join airports origin on origin.iata_code = upper(line.origin)
                left join airports destination on destination.iata_code = upper(line.destination)
                where invoice.status in ('SENT', 'DISPUTED', 'PAID')
                  and line.calculated_amount is not null
            )
            select airport_code as "airportCode",
                   airport_name as "airportName",
                   region as "region",
                   service_type as "serviceType",
                   aircraft_type as "aircraftType",
                   operation_type as "operationType",
                   currency as "currency",
                   avg(amount) as "averageCost",
                   count(*) as "observationCount",
                   avg(amount) filter (where airline_id = :requestingAirlineId) as "airlineAverageCost",
                   count(*) filter (where airline_id = :requestingAirlineId) as "airlineObservationCount",
                   percentile_cont(0.25) within group (order by amount) as "lowerQuartile",
                   percentile_cont(0.75) within group (order by amount) as "upperQuartile"
            from observations
            group by airport_code, airport_name, region, service_type, aircraft_type,
                     operation_type, currency
            having count(distinct supplier_id) >= 2
            """, nativeQuery = true)
    List<MarketIntelligenceAggregate> findAnonymizedAggregates(
            @Param("requestingAirlineId") String requestingAirlineId);
}
