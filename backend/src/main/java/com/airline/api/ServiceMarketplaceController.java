package com.airline.api;

import com.airline.api.dto.ServiceOfferingCreateRequest;
import com.airline.api.dto.ServiceOfferingResponse;
import com.airline.service.ServiceMarketplaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ServiceMarketplaceController {

    private final ServiceMarketplaceService serviceMarketplaceService;

    public ServiceMarketplaceController(ServiceMarketplaceService serviceMarketplaceService) {
        this.serviceMarketplaceService = serviceMarketplaceService;
    }

    @GetMapping("/supplier/offerings")
    public List<ServiceOfferingResponse> listOwnOfferings() {
        return serviceMarketplaceService.listOwnOfferings();
    }

    @PostMapping("/supplier/offerings")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceOfferingResponse createOffering(
            @Valid @RequestBody ServiceOfferingCreateRequest request) {
        return serviceMarketplaceService.createOffering(request);
    }

    @org.springframework.web.bind.annotation.PutMapping("/supplier/offerings/{offeringId}")
    public ServiceOfferingResponse updateOffering(
            @PathVariable String offeringId,
            @Valid @RequestBody ServiceOfferingCreateRequest request) {
        return serviceMarketplaceService.updateOffering(offeringId, request);
    }

    @DeleteMapping("/supplier/offerings/{offeringId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOffering(@PathVariable String offeringId) {
        serviceMarketplaceService.deleteOffering(offeringId);
    }

    @GetMapping("/marketplace/offerings")
    public List<ServiceOfferingResponse> browseMarketplace(
            @RequestParam(required = false) String airportCode,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String serviceType) {
        return serviceMarketplaceService.browseMarketplace(airportCode, region, serviceType);
    }
}
