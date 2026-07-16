package com.airline.service;

import com.airline.domain.Airline;
import com.airline.domain.Airport;
import com.airline.domain.ChargeCode;
import com.airline.repository.AirlineRepository;
import com.airline.repository.AirportRepository;
import com.airline.repository.ChargeCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReferenceDataService {

    // Closed vocabulary — the 25 IATA charge codes from architecture-contract.md §3.3.3
    public static final Set<String> VALID_CHARGE_CODES = Set.of(
        "BAGGAGE", "BAGGAGE_DELIVERY", "CARGO_HANDLING", "CATERING", "CLEANING",
        "COMMISSION", "CREW_ACCOMMODATION", "CREW_TRANSPORTATION", "CUSTOMS_SERVICE_CHARGE",
        "DEICING", "DEPARTURE_STAMPS", "IMMIGRATION_FINES", "LOUNGES", "MISCELLANEOUS",
        "MISHANDLING_BAGGAGE", "MISHANDLING_PASSENGER", "MOTOR_FUEL", "PASSENGER_HANDLING",
        "PASSENGER_TRANSPORTATION", "PASSENGER_SECURITY", "RAMP_HANDLING", "RENT_EQUIPMENT",
        "STAND", "STPC", "UTILITIES"
    );

    private final ChargeCodeRepository chargeCodeRepository;
    private final AirlineRepository airlineRepository;
    private final AirportRepository airportRepository;

    // --- Charge Codes ---

    public List<ChargeCode> listChargeCodes() {
        return chargeCodeRepository.findAllByOrderByCodeAsc();
    }

    public ChargeCode getChargeCode(String code) {
        // Enforce closed vocabulary: fail closed for unsupported codes (INV-12)
        if (!VALID_CHARGE_CODES.contains(code.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Unsupported IATA charge code: " + code);
        }
        return chargeCodeRepository.findById(code.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Charge code not found: " + code));
    }

    // --- Airlines ---

    public List<Airline> listAirlines() {
        return airlineRepository.findAllByOrderByNameAsc();
    }

    public Airline getAirline(String iataCode) {
        return airlineRepository.findById(iataCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Airline not found: " + iataCode));
    }

    // --- Airports ---

    public List<Airport> listAirports() {
        return airportRepository.findAllByOrderByIataCodeAsc();
    }

    public Airport getAirport(String iataCode) {
        return airportRepository.findById(iataCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Airport not found: " + iataCode));
    }

    public List<Airport> listAirportsByRegion(String region) {
        return airportRepository.findByRegionIgnoreCase(region);
    }
}
