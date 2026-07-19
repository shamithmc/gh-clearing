package com.airline.api;

import com.airline.api.dto.DashboardDtos.*;
import com.airline.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/receivables")
    public ReceivablesSummary getReceivablesSummary() {
        return dashboardService.getReceivablesSummary();
    }

    @GetMapping("/invoiced-monthly")
    public List<InvoicedTrend> getInvoicedTrend() {
        return dashboardService.getInvoicedTrend();
    }

    @GetMapping("/revenue-per-flight")
    public List<RevenuePerFlightTrend> getRevenuePerFlightTrend() {
        return dashboardService.getRevenuePerFlightTrend();
    }

    @GetMapping("/expiring-contracts")
    public List<ExpiringContract> getExpiringContracts() {
        return dashboardService.getExpiringContracts();
    }
}
