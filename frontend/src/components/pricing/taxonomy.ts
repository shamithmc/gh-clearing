export interface ChargeCodeMetadata {
  defaultDriver: string;
  defaultUom: string;
  suggestedName?: string;
  category?: string;
}

export const CHARGE_CODE_TAXONOMY: Record<string, ChargeCodeMetadata> = {
  // Passenger Services
  PASSENGER_HANDLING: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Passenger Handling Services',
  },
  PASSENGER_SECURITY: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Passenger Security Screening',
  },
  MISHANDLING_PASSENGER: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Mishandled Passenger Assistance',
  },
  PASSENGER_TRANSPORTATION: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Passenger Apron Transportation',
  },
  LOUNGES: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Executive Airport Lounges',
  },
  STPC: {
    defaultDriver: 'passengers',
    defaultUom: 'PAX',
    suggestedName: 'Stopover Paid by Carrier (STPC)',
  },

  // Baggage Services
  BAGGAGE: {
    defaultDriver: 'bags',
    defaultUom: 'BAG',
    suggestedName: 'Baggage Handling & Sorting',
  },
  BAGGAGE_DELIVERY: {
    defaultDriver: 'bags',
    defaultUom: 'BAG',
    suggestedName: 'Baggage Delivery & Transfer',
  },
  MISHANDLING_BAGGAGE: {
    defaultDriver: 'bags',
    defaultUom: 'BAG',
    suggestedName: 'Mishandled Baggage Services',
  },

  // Cargo & Logistics
  CARGO_HANDLING: {
    defaultDriver: 'cargo_kg',
    defaultUom: 'KG',
    suggestedName: 'Cargo Handling & Processing',
  },

  // Ramp & Movement Services
  RAMP_HANDLING: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Ramp Handling Services',
  },
  STAND: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Aircraft Stand Allocation & Marshaling',
  },
  DEPARTURE_STAMPS: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Departure Stamps & Clearances',
  },
  CLEANING: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Cabin Cleaning Services',
  },
  CATERING: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'In-flight Catering Services',
  },
  CREW_TRANSPORTATION: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Crew Apron Transportation',
  },
  CUSTOMS_SERVICE_CHARGE: {
    defaultDriver: 'aircraft_movements',
    defaultUom: 'FLT',
    suggestedName: 'Customs Clearance & Service Charge',
  },

  // Deicing & Fueling
  DEICING: {
    defaultDriver: 'litres',
    defaultUom: 'LTR',
    suggestedName: 'Aircraft De-icing & Anti-icing',
  },
  MOTOR_FUEL: {
    defaultDriver: 'litres',
    defaultUom: 'LTR',
    suggestedName: 'Ground Equipment Motor Fuel',
  },

  // Equipment & Time-based
  RENT_EQUIPMENT: {
    defaultDriver: 'hours',
    defaultUom: 'HRS',
    suggestedName: 'Ground Support Equipment Rental',
  },
  UTILITIES: {
    defaultDriver: 'hours',
    defaultUom: 'HRS',
    suggestedName: 'Airport Utilities & 400Hz Ground Power',
  },
  CREW_ACCOMMODATION: {
    defaultDriver: 'hours',
    defaultUom: 'HRS',
    suggestedName: 'Crew Layover Accommodation',
  },

  // Fees & Other
  COMMISSION: {
    defaultDriver: 'events',
    defaultUom: 'UNIT',
    suggestedName: 'Administrative Commission',
  },
  IMMIGRATION_FINES: {
    defaultDriver: 'events',
    defaultUom: 'UNIT',
    suggestedName: 'Immigration Fines Admin Handling',
  },
  MISCELLANEOUS: {
    defaultDriver: 'events',
    defaultUom: 'UNIT',
    suggestedName: 'Miscellaneous Handling Services',
  },
};

export const DEFAULT_CHARGE_CODE_METADATA: ChargeCodeMetadata = {
  defaultDriver: 'events',
  defaultUom: 'UNIT',
  suggestedName: 'Handling Service Line',
};

export function getChargeCodeDefaults(chargeCode?: string): ChargeCodeMetadata {
  if (!chargeCode) return DEFAULT_CHARGE_CODE_METADATA;
  return CHARGE_CODE_TAXONOMY[chargeCode] || DEFAULT_CHARGE_CODE_METADATA;
}

export const STANDARD_QUANTITY_DRIVERS = [
  { value: 'passengers', label: 'passengers (Passenger Count)' },
  { value: 'bags', label: 'bags (Baggage Pieces)' },
  { value: 'cargo_kg', label: 'cargo_kg (Cargo Kilograms)' },
  { value: 'uld_count', label: 'uld_count (Unit Load Devices)' },
  { value: 'aircraft_movements', label: 'aircraft_movements (Flight Turnarounds / Movements)' },
  { value: 'hours', label: 'hours (Duration in Hours)' },
  { value: 'litres', label: 'litres (Liquid Volume in Litres)' },
  { value: 'mtow_tonnes', label: 'mtow_tonnes (Aircraft MTOW in Tonnes)' },
  { value: 'events', label: 'events (Discrete Events)' },
  { value: 'units', label: 'units (Generic Units)' },
];

export const STANDARD_UOMS = [
  { value: 'PAX', label: 'PAX (Passengers)' },
  { value: 'BAG', label: 'BAG (Bags)' },
  { value: 'KG', label: 'KG (Kilograms)' },
  { value: 'ULD', label: 'ULD (Unit Load Device)' },
  { value: 'FLT', label: 'FLT (Flight / Movement)' },
  { value: 'MVT', label: 'MVT (Movement)' },
  { value: 'HRS', label: 'HRS (Hours)' },
  { value: 'LTR', label: 'LTR (Litres)' },
  { value: 'TONNE', label: 'TONNE (Metric Tonne)' },
  { value: 'UNIT', label: 'UNIT (Units)' },
];
