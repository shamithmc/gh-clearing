import { describe, it, expect } from 'vitest';
import {
  CHARGE_CODE_TAXONOMY,
  DEFAULT_CHARGE_CODE_METADATA,
  getChargeCodeDefaults,
  STANDARD_QUANTITY_DRIVERS,
  STANDARD_UOMS,
} from '../taxonomy';

describe('Pricing Taxonomy and Reference Mappings', () => {
  it('maps passenger handling charge codes to passengers and PAX', () => {
    const paxDefaults = getChargeCodeDefaults('PASSENGER_HANDLING');
    expect(paxDefaults.defaultDriver).toBe('passengers');
    expect(paxDefaults.defaultUom).toBe('PAX');

    const secDefaults = getChargeCodeDefaults('PASSENGER_SECURITY');
    expect(secDefaults.defaultDriver).toBe('passengers');
    expect(secDefaults.defaultUom).toBe('PAX');

    const mishandledPax = getChargeCodeDefaults('MISHANDLING_PASSENGER');
    expect(mishandledPax.defaultDriver).toBe('passengers');
    expect(mishandledPax.defaultUom).toBe('PAX');
  });

  it('maps baggage charge codes to bags and BAG', () => {
    const bagDefaults = getChargeCodeDefaults('BAGGAGE');
    expect(bagDefaults.defaultDriver).toBe('bags');
    expect(bagDefaults.defaultUom).toBe('BAG');

    const bagDelivery = getChargeCodeDefaults('BAGGAGE_DELIVERY');
    expect(bagDelivery.defaultDriver).toBe('bags');
    expect(bagDelivery.defaultUom).toBe('BAG');

    const mishandledBag = getChargeCodeDefaults('MISHANDLING_BAGGAGE');
    expect(mishandledBag.defaultDriver).toBe('bags');
    expect(mishandledBag.defaultUom).toBe('BAG');
  });

  it('maps cargo handling to cargo_kg and KG', () => {
    const cargoDefaults = getChargeCodeDefaults('CARGO_HANDLING');
    expect(cargoDefaults.defaultDriver).toBe('cargo_kg');
    expect(cargoDefaults.defaultUom).toBe('KG');
  });

  it('maps ramp, stand, cleaning, and departure stamps to aircraft_movements and FLT', () => {
    const rampDefaults = getChargeCodeDefaults('RAMP_HANDLING');
    expect(rampDefaults.defaultDriver).toBe('aircraft_movements');
    expect(rampDefaults.defaultUom).toBe('FLT');

    const standDefaults = getChargeCodeDefaults('STAND');
    expect(standDefaults.defaultDriver).toBe('aircraft_movements');
    expect(standDefaults.defaultUom).toBe('FLT');

    const cleanDefaults = getChargeCodeDefaults('CLEANING');
    expect(cleanDefaults.defaultDriver).toBe('aircraft_movements');
    expect(cleanDefaults.defaultUom).toBe('FLT');

    const departureStamps = getChargeCodeDefaults('DEPARTURE_STAMPS');
    expect(departureStamps.defaultDriver).toBe('aircraft_movements');
    expect(departureStamps.defaultUom).toBe('FLT');
  });

  it('maps deicing and motor fuel to litres and LTR', () => {
    const deicingDefaults = getChargeCodeDefaults('DEICING');
    expect(deicingDefaults.defaultDriver).toBe('litres');
    expect(deicingDefaults.defaultUom).toBe('LTR');

    const fuelDefaults = getChargeCodeDefaults('MOTOR_FUEL');
    expect(fuelDefaults.defaultDriver).toBe('litres');
    expect(fuelDefaults.defaultUom).toBe('LTR');
  });

  it('maps equipment rental and utilities to hours and HRS', () => {
    const rentDefaults = getChargeCodeDefaults('RENT_EQUIPMENT');
    expect(rentDefaults.defaultDriver).toBe('hours');
    expect(rentDefaults.defaultUom).toBe('HRS');

    const utilDefaults = getChargeCodeDefaults('UTILITIES');
    expect(utilDefaults.defaultDriver).toBe('hours');
    expect(utilDefaults.defaultUom).toBe('HRS');
  });

  it('returns default fallback metadata for unmapped or empty charge codes', () => {
    const unmapped = getChargeCodeDefaults('UNKNOWN_CUSTOM_CODE');
    expect(unmapped.defaultDriver).toBe(DEFAULT_CHARGE_CODE_METADATA.defaultDriver);
    expect(unmapped.defaultUom).toBe(DEFAULT_CHARGE_CODE_METADATA.defaultUom);

    const empty = getChargeCodeDefaults(undefined);
    expect(empty.defaultDriver).toBe('events');
    expect(empty.defaultUom).toBe('UNIT');
  });

  it('contains expected standard quantity driver and UoM options', () => {
    const driverValues = STANDARD_QUANTITY_DRIVERS.map((d) => d.value);
    expect(driverValues).toContain('passengers');
    expect(driverValues).toContain('bags');
    expect(driverValues).toContain('cargo_kg');
    expect(driverValues).toContain('uld_count');
    expect(driverValues).toContain('aircraft_movements');
    expect(driverValues).toContain('hours');
    expect(driverValues).toContain('litres');
    expect(driverValues).toContain('mtow_tonnes');
    expect(driverValues).toContain('events');
    expect(driverValues).toContain('units');

    const uomValues = STANDARD_UOMS.map((u) => u.value);
    expect(uomValues).toContain('PAX');
    expect(uomValues).toContain('BAG');
    expect(uomValues).toContain('KG');
    expect(uomValues).toContain('ULD');
    expect(uomValues).toContain('FLT');
    expect(uomValues).toContain('MVT');
    expect(uomValues).toContain('HRS');
    expect(uomValues).toContain('LTR');
    expect(uomValues).toContain('TONNE');
    expect(uomValues).toContain('UNIT');
  });
});
