import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form } from 'antd';
import { TiersEditor } from '../TiersEditor';
import { TimeBandsEditor } from '../TimeBandsEditor';
import { DayRatesEditor } from '../DayRatesEditor';
import { CompoundDriverEditor } from '../CompoundDriverEditor';
import { MtowEditor } from '../MtowEditor';
import { FormulaReviewCard } from '../FormulaReviewCard';

const TestWrapper: React.FC<{
  children: (form: any, fieldIndex: number) => React.ReactNode;
  initialValues?: any;
}> = ({
  children,
  initialValues = {
    services: [
      {
        chargeCode: 'PASSENGER_HANDLING',
        serviceName: 'Turnaround Passenger Handling',
        formulaType: 'PF-01',
        quantityDriver: 'passengers',
        uom: 'PAX',
        rate: '12.50',
      },
    ],
  },
}) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} initialValues={initialValues}>
      <Form.List name="services">
        {(fields) =>
          fields.map(({ name }) => (
            <div key={name}>{children(form, name)}</div>
          ))
        }
      </Form.List>
    </Form>
  );
};

describe('Pricing Formula Sub-Editors', () => {
  describe('TiersEditor (PF-03 / PF-04)', () => {
    it('renders tier table headers, presets, and add tier button', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-03',
                tiers: [
                  { upto: 100, rate: 10.0, isTerminal: false },
                  { upto: 500, rate: 8.5, isTerminal: false },
                  { upto: null, rate: 6.0, isTerminal: true },
                ],
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <TiersEditor fieldIndex={fieldIndex} form={form} formulaType="PF-03" />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('Incremental Volume Tiers')).toBeInTheDocument();
      expect(screen.getByText('3 Tiers (100 / 500 / ∞)')).toBeInTheDocument();
      expect(screen.getByText('2 Slabs (50 / ∞)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add tier row/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Terminal/i).length).toBeGreaterThan(0);
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });

    it('renders slab editor title for PF-04', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-04',
                tiers: [{ upto: 50, rate: 20.0, isTerminal: false }],
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <TiersEditor fieldIndex={fieldIndex} form={form} formulaType="PF-04" />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('All-Units Slab Bands')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });
  });

  describe('TimeBandsEditor (PF-05)', () => {
    it('renders time band inputs, presets, and handles add time band', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-05',
                timeBands: [
                  { start: '06:00', end: '22:00', rate: 100.0 },
                  { start: '22:00', end: '06:00', rate: 150.0 },
                ],
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <TimeBandsEditor fieldIndex={fieldIndex} form={form} />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('Time-of-Day Bands (PF-05)')).toBeInTheDocument();
      expect(screen.getByText(/Day\/Night/i)).toBeInTheDocument();
      expect(screen.getByText(/3-Shift Bands/i)).toBeInTheDocument();
      expect(screen.getByText('Overnight')).toBeInTheDocument();
      expect(screen.getAllByDisplayValue('06:00')).toHaveLength(2);
      expect(screen.getAllByDisplayValue('22:00')).toHaveLength(2);
    });
  });

  describe('DayRatesEditor (PF-06)', () => {
    it('renders 7 days of the week and presets', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-06',
                dayRates: {
                  MONDAY: 50.0,
                  TUESDAY: 50.0,
                  WEDNESDAY: 50.0,
                  THURSDAY: 50.0,
                  FRIDAY: 50.0,
                  SATURDAY: 75.0,
                  SUNDAY: 75.0,
                },
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <DayRatesEditor fieldIndex={fieldIndex} form={form} />
          )}
        </TestWrapper>
      );

      expect(screen.getByText('Day-of-Week Rates (PF-06)')).toBeInTheDocument();
      expect(screen.getByText('Same Rate All Days')).toBeInTheDocument();
      expect(screen.getByText('Weekday / Weekend Split')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });
  });

  describe('CompoundDriverEditor (PF-02)', () => {
    it('renders compound multi-driver selector and base rate', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-02',
                compoundDrivers: ['passengers', 'bags'],
                rate: '1.25',
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <CompoundDriverEditor fieldIndex={fieldIndex} form={form} />
          )}
        </TestWrapper>
      );

      expect(screen.getByText(/Compound Multi-Driver Setup/i)).toBeInTheDocument();
      expect(screen.getByText('passengers × bags')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1.25')).toBeInTheDocument();
    });
  });

  describe('MtowEditor (PF-07)', () => {
    it('renders MTOW rate input and invariant guard explanation', () => {
      render(
        <TestWrapper
          initialValues={{
            services: [
              {
                formulaType: 'PF-07',
                rate: '4.75',
              },
            ],
          }}
        >
          {(form, fieldIndex) => (
            <MtowEditor fieldIndex={fieldIndex} form={form} />
          )}
        </TestWrapper>
      );

      expect(screen.getByText(/MTOW-Based Aircraft Weight Pricing/i)).toBeInTheDocument();
      expect(screen.getByText(/MTOW Resolution & Invariant Guard \(INV-05\)/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('4.75')).toBeInTheDocument();
    });
  });

  describe('FormulaReviewCard (Step 3 Summary)', () => {
    it('renders review card for PF-01 Unit Rate', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Turnaround',
            formulaType: 'PF-01',
            quantityDriver: 'passengers',
            uom: 'PAX',
            rate: 12.5,
          }}
          currency="USD"
        />
      );

      expect(screen.getByText('Passenger Turnaround')).toBeInTheDocument();
      expect(screen.getByText('PF-01: Unit Rate')).toBeInTheDocument();
      expect(screen.getByText('USD 12.50 / PAX')).toBeInTheDocument();
    });

    it('renders review card for PF-02 Compound Rate', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'BAGGAGE',
            serviceName: 'Compound Baggage Service',
            formulaType: 'PF-02',
            quantityDriver: 'passengers,bags',
            uom: 'PAX_BAG',
            rate: 1.25,
          }}
          currency="USD"
        />
      );

      expect(screen.getByText('Compound Baggage Service')).toBeInTheDocument();
      expect(screen.getByText('PF-02: Compound Unit Rate')).toBeInTheDocument();
      expect(screen.getByText('USD 1.25')).toBeInTheDocument();
      expect(screen.getByText('passengers')).toBeInTheDocument();
      expect(screen.getByText('bags')).toBeInTheDocument();
    });

    it('renders review card for PF-03 Tiered Volume', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'BAGGAGE',
            serviceName: 'Baggage Sorting',
            formulaType: 'PF-03',
            quantityDriver: 'bags',
            uom: 'BAG',
            tiers: [
              { upto: 100, rate: 10.0 },
              { upto: 500, rate: 8.5 },
              { upto: null, rate: 6.0, isTerminal: true },
            ],
          }}
          currency="USD"
        />
      );

      expect(screen.getByText('Baggage Sorting')).toBeInTheDocument();
      expect(screen.getByText('PF-03: Incremental Tiered Volume')).toBeInTheDocument();
      expect(screen.getByText('USD 10.00')).toBeInTheDocument();
      expect(screen.getByText('USD 8.50')).toBeInTheDocument();
      expect(screen.getByText('USD 6.00')).toBeInTheDocument();
    });

    it('renders review card for PF-04 Slab Rate', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'CARGO_HANDLING',
            serviceName: 'All-Units Cargo Slab',
            formulaType: 'PF-04',
            quantityDriver: 'cargo_kg',
            uom: 'KG',
            tiers: [
              { upto: 50, rate: 15.0 },
              { upto: 200, rate: 12.0 },
              { upto: null, rate: 9.0, isTerminal: true },
            ],
          }}
          currency="USD"
        />
      );

      expect(screen.getByText('All-Units Cargo Slab')).toBeInTheDocument();
      expect(screen.getByText('PF-04: All-Units Slab Rate')).toBeInTheDocument();
      expect(screen.getByText('USD 15.00')).toBeInTheDocument();
      expect(screen.getByText('USD 12.00')).toBeInTheDocument();
      expect(screen.getByText('USD 9.00')).toBeInTheDocument();
    });

    it('renders review card for PF-05 Time Bands', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'RAMP_HANDLING',
            serviceName: 'Ramp Night Ops',
            formulaType: 'PF-05',
            quantityDriver: 'flights',
            uom: 'FLIGHT',
            timeBands: [
              { start: '06:00', end: '22:00', rate: 100.0 },
              { start: '22:00', end: '06:00', rate: 150.0 },
            ],
          }}
          currency="EUR"
        />
      );

      expect(screen.getByText('Ramp Night Ops')).toBeInTheDocument();
      expect(screen.getByText('PF-05: Time Band Rate')).toBeInTheDocument();
      expect(screen.getByText('06:00 – 22:00')).toBeInTheDocument();
      expect(screen.getByText('22:00 – 06:00')).toBeInTheDocument();
      expect(screen.getByText('EUR 100.00')).toBeInTheDocument();
      expect(screen.getByText('EUR 150.00')).toBeInTheDocument();
    });

    it('renders review card for PF-06 Day Rates', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'DEICING',
            serviceName: 'Day-of-Week Deicing',
            formulaType: 'PF-06',
            quantityDriver: 'flights',
            uom: 'FLIGHT',
            dayRates: {
              MONDAY: 50.0,
              TUESDAY: 50.0,
              WEDNESDAY: 50.0,
              THURSDAY: 50.0,
              FRIDAY: 50.0,
              SATURDAY: 75.0,
              SUNDAY: 75.0,
            },
          }}
          currency="AED"
        />
      );

      expect(screen.getByText('Day-of-Week Deicing')).toBeInTheDocument();
      expect(screen.getByText('PF-06: Day-of-Week Rate')).toBeInTheDocument();
      expect(screen.getAllByText('AED 50.00')).toHaveLength(5);
      expect(screen.getAllByText('AED 75.00')).toHaveLength(2);
    });

    it('renders review card for PF-07 MTOW Rate', () => {
      render(
        <FormulaReviewCard
          index={0}
          service={{
            chargeCode: 'STAND',
            serviceName: 'Stand Weight Fee',
            formulaType: 'PF-07',
            quantityDriver: 'mtow',
            uom: 'TONNE',
            rate: 4.75,
          }}
          currency="USD"
        />
      );

      expect(screen.getByText('Stand Weight Fee')).toBeInTheDocument();
      expect(screen.getByText('PF-07: MTOW Aircraft Weight')).toBeInTheDocument();
      expect(screen.getByText('USD 4.75 / Tonne')).toBeInTheDocument();
      expect(screen.getByText(/Tail Registry lookup enforced/i)).toBeInTheDocument();
    });
  });
});
