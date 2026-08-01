package com.airline.vocabularies;

import com.airline.domain.ChargeCode;
import com.airline.domain.DisputeAction;
import com.airline.domain.DisputeStatus;
import com.airline.repository.ChargeCodeRepository;
import com.airline.service.ReferenceDataService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * INV-12: Closed Vocabulary Enforcement
 * Verifies that only the 25 IATA charge codes defined in architecture-contract.md §3.3.3
 * are accepted, and that unsupported codes fail closed.
 */
@ExtendWith(MockitoExtension.class)
class VocabularyEnforcementTest {

    @Mock
    private ChargeCodeRepository chargeCodeRepository;

    @Mock
    private com.airline.repository.AirlineRepository airlineRepository;

    @Mock
    private com.airline.repository.AirportRepository airportRepository;

    @InjectMocks
    private ReferenceDataService referenceDataService;

    @Test
    void validChargeCodeSet_containsExactly25Codes() {
        // The closed vocabulary MUST contain exactly 25 codes as per §3.3.3
        assertThat(ReferenceDataService.VALID_CHARGE_CODES).hasSize(25);
    }

    @Test
    void disputeStatuses_matchArchitectureClosedVocabulary() {
        assertThat(DisputeStatus.values()).containsExactlyInAnyOrder(
                DisputeStatus.OPEN,
                DisputeStatus.UNDER_REVIEW,
                DisputeStatus.RESPONDED,
                DisputeStatus.ACCEPTED,
                DisputeStatus.REJECTED,
                DisputeStatus.ESCALATED);
    }

    @Test
    void disputeActions_rejectUnsupportedValues() {
        assertThat(DisputeAction.parse("accept")).isEqualTo(DisputeAction.ACCEPT);
        assertThatThrownBy(() -> DisputeAction.parse("RESOLVE_ANYWAY"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported dispute action");
    }

    @Test
    void validChargeCodeSet_containsAllRequiredCodes() {
        Set<String> expectedCodes = Set.of(
            "BAGGAGE", "BAGGAGE_DELIVERY", "CARGO_HANDLING", "CATERING", "CLEANING",
            "COMMISSION", "CREW_ACCOMMODATION", "CREW_TRANSPORTATION", "CUSTOMS_SERVICE_CHARGE",
            "DEICING", "DEPARTURE_STAMPS", "IMMIGRATION_FINES", "LOUNGES", "MISCELLANEOUS",
            "MISHANDLING_BAGGAGE", "MISHANDLING_PASSENGER", "MOTOR_FUEL", "PASSENGER_HANDLING",
            "PASSENGER_TRANSPORTATION", "PASSENGER_SECURITY", "RAMP_HANDLING", "RENT_EQUIPMENT",
            "STAND", "STPC", "UTILITIES"
        );
        assertThat(ReferenceDataService.VALID_CHARGE_CODES).containsExactlyInAnyOrderElementsOf(expectedCodes);
    }

    @Test
    void getChargeCode_withUnsupportedCode_failsClosed() {
        // INV-12: unsupported codes MUST fail closed (NOT_FOUND), never silently degrade
        assertThatThrownBy(() -> referenceDataService.getChargeCode("UNKNOWN_SERVICE"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported IATA charge code");

        // Repository should NOT be queried for invalid codes
        verifyNoInteractions(chargeCodeRepository);
    }

    @Test
    void getChargeCode_withValidCode_queriesRepository() {
        ChargeCode baggage = new ChargeCode("BAGGAGE", "Baggage Handling", "Handling of baggage");
        when(chargeCodeRepository.findById("BAGGAGE")).thenReturn(Optional.of(baggage));

        ChargeCode result = referenceDataService.getChargeCode("BAGGAGE");

        assertThat(result.getCode()).isEqualTo("BAGGAGE");
        verify(chargeCodeRepository).findById("BAGGAGE");
    }

    @Test
    void listChargeCodes_returnsResults() {
        List<ChargeCode> codes = List.of(
                new ChargeCode("BAGGAGE", "Baggage Handling", "desc"),
                new ChargeCode("CATERING", "Catering", "desc")
        );
        when(chargeCodeRepository.findAllByOrderByCodeAsc()).thenReturn(codes);

        List<ChargeCode> result = referenceDataService.listChargeCodes();
        assertThat(result).hasSize(2);
    }
}
