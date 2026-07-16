package com.airline.api;

import com.airline.api.dto.ContractCreateRequest;
import com.airline.api.dto.ContractResponse;
import com.airline.api.dto.ServiceConfigurationDTO;
import com.airline.domain.ContractStatus;
import com.airline.service.ContractService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContractController.class)
@Import(com.airline.config.SecurityConfig.class)
public class ContractControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ContractService contractService;

    @Test
    void shouldCreateContractSuccessfully() throws Exception {
        ContractCreateRequest request = new ContractCreateRequest();
        request.setAirlineId("EK");
        request.setAirportCode("DXB");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusYears(1));
        request.setCurrency("USD");

        ServiceConfigurationDTO svc = new ServiceConfigurationDTO();
        svc.setChargeCode("BAGGAGE");
        svc.setServiceName("Baggage Handling");
        svc.setFormulaType("PF-01");
        svc.setQuantityDriver("bags");
        svc.setUom("EA");
        svc.setRateDetails(Map.of("rate", 15.5));
        
        request.setServices(List.of(svc));

        ContractResponse response = ContractResponse.builder()
                .id("test-contract-id")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(ContractStatus.DRAFT)
                .currency("USD")
                .services(List.of(svc))
                .build();

        when(contractService.createContract(any(ContractCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/contracts")
                        .with(jwt().jwt(builder -> builder.claim("tenant_id", "SWISSPORT").claim("tenant_type", "GROUND_HANDLER").claim("roles", List.of("CONTRACT_MANAGER"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("test-contract-id"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.services[0].chargeCode").value("BAGGAGE"));
    }

    @Test
    void shouldFailIfNoTokenProvided() throws Exception {
        ContractCreateRequest request = new ContractCreateRequest();
        request.setAirlineId("EK");
        request.setAirportCode("DXB");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusYears(1));
        request.setCurrency("USD");
        request.setServices(List.of());

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
