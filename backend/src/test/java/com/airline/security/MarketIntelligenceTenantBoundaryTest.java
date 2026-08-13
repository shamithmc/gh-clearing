package com.airline.security;

import com.airline.repository.MarketIntelligenceRepository;
import com.airline.repository.MarketIntelligenceAggregate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Transactional
class MarketIntelligenceTenantBoundaryTest {

    @Autowired
    private MarketIntelligenceRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void returnsOnlyGroupsWithTwoSuppliersAndNeverReturnsTenantIdentifiers() {
        insertTenant("MARKET-GH-A", "Market Supplier A", "GROUND_HANDLER");
        insertTenant("MARKET-GH-B", "Market Supplier B", "GROUND_HANDLER");
        insertTenant("MARKET-AIR", "Market Airline", "AIRLINE");
        insertAirport("ZZA", "Market Origin", "Marketland A");
        insertAirport("ZZB", "Market Destination", "Marketland B");

        insertInvoice("MARKET-INV-A", "MARKET-GH-A", "MARKET-AIR", "BAGGAGE", "100.00");
        insertInvoice("MARKET-INV-B", "MARKET-GH-B", "MARKET-AIR", "BAGGAGE", "140.00");
        insertInvoice("MARKET-INV-SINGLE", "MARKET-GH-A", "MARKET-AIR", "CATERING", "75.00");

        List<MarketIntelligenceAggregate> aggregates =
                repository.findAnonymizedAggregates("MARKET-AIR");

        assertThat(aggregates)
                .filteredOn(aggregate -> "ZZA".equals(aggregate.getAirportCode())
                        && "BAGGAGE".equals(aggregate.getServiceType()))
                .singleElement()
                .satisfies(aggregate -> {
                    assertThat(aggregate.getAverageCost()).isEqualByComparingTo("120.00");
                    assertThat(aggregate.getObservationCount()).isEqualTo(2L);
                    assertThat(aggregate.getAirlineAverageCost()).isEqualByComparingTo("120.00");
                    assertThat(aggregate.getAirlineObservationCount()).isEqualTo(2L);
                    assertThat(aggregate.getLowerQuartile()).isEqualByComparingTo("110.00");
                    assertThat(aggregate.getUpperQuartile()).isEqualByComparingTo("130.00");
                });
        assertThat(aggregates)
                .noneMatch(aggregate -> "ZZA".equals(aggregate.getAirportCode())
                        && "CATERING".equals(aggregate.getServiceType()));
        assertThat(MarketIntelligenceAggregate.class.getMethods())
                .extracting(java.lang.reflect.Method::getName)
                .noneMatch(name -> name.toLowerCase().contains("supplierid")
                        || name.toLowerCase().contains("airlineid"));
    }

    private void insertTenant(String id, String name, String type) {
        jdbcTemplate.update(
                "insert into tenants (id, name, type, status) values (?, ?, ?, 'ACTIVE')",
                id, name, type);
    }

    private void insertAirport(String code, String name, String country) {
        jdbcTemplate.update("""
                insert into airports (iata_code, name, city, country, region, latitude, longitude)
                values (?, ?, 'Market City', ?, 'TEST_REGION', 0, 0)
                """, code, name, country);
    }

    private void insertInvoice(
            String invoiceId,
            String supplierId,
            String airlineId,
            String chargeCode,
            String amount) {
        jdbcTemplate.update("""
                insert into invoices (
                    id, invoice_number, tenant_id, airline_id, airport_code, currency,
                    issue_date, due_date, status, total_amount
                ) values (?, ?, ?, ?, 'ZZA', 'USD', current_date, current_date, 'DRAFT', ?)
                """, invoiceId, invoiceId, supplierId, airlineId, new BigDecimal(amount));
        jdbcTemplate.update("""
                insert into invoice_line_items (
                    id, invoice_id, flight_date, flight_number, aircraft_reg, aircraft_type,
                    origin, destination, charge_code, service_name, formula_type,
                    quantity_drivers, calculated_amount
                ) values (?, ?, current_date, 'EK001', 'A6-MKT', 'A380', 'ZZA', 'ZZB',
                          ?, ?, 'PF-01', '{}', ?)
                """, invoiceId + "-LINE", invoiceId, chargeCode, chargeCode, new BigDecimal(amount));
        jdbcTemplate.update("update invoices set status = 'SENT' where id = ?", invoiceId);
    }
}
