export interface TierItem {
  upto: number | null | string;
  rate: number | string;
  isTerminal?: boolean;
}

export interface TimeBandItem {
  start: string;
  end: string;
  rate: number | string;
}

export type DayOfWeekName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type DayRatesMap = Record<DayOfWeekName, number | string>;

export interface ServiceLineFormValues {
  chargeCode: string;
  serviceName: string;
  formulaType: 'PF-01' | 'PF-02' | 'PF-03' | 'PF-04' | 'PF-05' | 'PF-06' | 'PF-07';
  quantityDriver: string;
  uom: string;
  taxCode?: string;
  billingFrequency?: string;
  rate?: number | string;
  compoundDrivers?: string[];
  tiers?: TierItem[];
  timeBands?: TimeBandItem[];
  dayRates?: DayRatesMap;
}

export interface ReferenceAirline {
  iataCode: string;
  name: string;
}

export interface ReferenceAirport {
  iataCode: string;
  name: string;
  city?: string;
  country?: string;
}

export interface ReferenceChargeCode {
  code: string;
  name?: string;
  category?: string;
  description?: string;
}
