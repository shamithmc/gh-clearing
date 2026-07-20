package com.airline.api;

import com.airline.api.dto.DashboardDtos.*;
import com.airline.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/receivables")
    public ReceivablesSummary getReceivablesSummary(
            @RequestParam(required = false) String airlineId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return dashboardService.getReceivablesSummary(airlineId, airportCode, startDate, endDate);
    }

    @GetMapping("/invoiced-monthly")
    public List<InvoicedTrend> getInvoicedTrend(
            @RequestParam(required = false) String airlineId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return dashboardService.getInvoicedTrend(airlineId, airportCode, startDate, endDate);
    }

    @GetMapping("/revenue-per-flight")
    public List<RevenuePerFlightTrend> getRevenuePerFlightTrend(
            @RequestParam(required = false) String airlineId,
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return dashboardService.getRevenuePerFlightTrend(airlineId, airportCode, startDate, endDate);
    }

    @GetMapping("/expiring-contracts")
    public List<ExpiringContract> getExpiringContracts(
            @RequestParam(required = false) String airlineId,
            @RequestParam(required = false) String airportCode) {
        return dashboardService.getExpiringContracts(airlineId, airportCode);
    }
}
