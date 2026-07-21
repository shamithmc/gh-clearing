package com.airline.api;

import com.airline.api.dto.ContractReviewRequestResponse;
import com.airline.domain.ContractStatus;
import com.airline.service.ContractReviewRequestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContractReviewRequestController.class)
@Import(com.airline.config.SecurityConfig.class)
class ContractReviewRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ContractReviewRequestService service;

    @Test
    void createsReviewRequestWithMandatoryComment() throws Exception {
        when(service.create("contract-1", "Please review the rate"))
                .thenReturn(response());

        mockMvc.perform(post("/api/contracts/contract-1/review-requests")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("CONTRACT_REVIEWER"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"Please review the rate\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contractId").value("contract-1"))
                .andExpect(jsonPath("$.comment").value("Please review the rate"));

        verify(service).create("contract-1", "Please review the rate");
    }

    @Test
    void rejectsBlankCommentBeforeServiceInvocation() throws Exception {
        mockMvc.perform(post("/api/contracts/contract-1/review-requests")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "EK")
                                .claim("tenant_type", "AIRLINE")
                                .claim("roles", List.of("CONTRACT_REVIEWER"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listsGroundHandlerReviewQueue() throws Exception {
        when(service.getGroundHandlerQueue()).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/contract-review-requests")
                        .with(jwt().jwt(builder -> builder
                                .claim("tenant_id", "SWISSPORT")
                                .claim("tenant_type", "GROUND_HANDLER")
                                .claim("roles", List.of("CONTRACT_ENTRY")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].airlineId").value("EK"))
                .andExpect(jsonPath("$[0].airportCode").value("DXB"));
    }

    private ContractReviewRequestResponse response() {
        return ContractReviewRequestResponse.builder()
                .id("request-1")
                .contractId("contract-1")
                .groundHandlerId("SWISSPORT")
                .airlineId("EK")
                .airportCode("DXB")
                .contractStatus(ContractStatus.APPROVED)
                .comment("Please review the rate")
                .requestedBy("airline-reviewer")
                .createdAt(OffsetDateTime.parse("2026-07-21T10:00:00Z"))
                .build();
    }
}
