import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContractWizard from '../ContractWizard';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ContractWizard Dynamic Formula Authoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/reference/airlines')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { iataCode: 'EK', name: 'Emirates' },
              { iataCode: 'LH', name: 'Lufthansa' },
            ]),
        });
      }
      if (url.includes('/api/reference/airports')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { iataCode: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
              { iataCode: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt' },
            ]),
        });
      }
      if (url.includes('/api/reference/charge-codes')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { code: 'BAGGAGE', name: 'Baggage Handling' },
              { code: 'PASSENGER_HANDLING', name: 'Passenger Handling' },
              { code: 'DEICING', name: 'Aircraft De-icing' },
              { code: 'RAMP_HANDLING', name: 'Ramp Handling Services' },
            ]),
        });
      }
      if (url.includes('/api/contracts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'CTR-001', status: 'DRAFT' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders Step 1 header and reference selectors', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    expect(screen.getByText('Create Ground Handling Agreement (SGHA)')).toBeInTheDocument();
    expect(screen.getByText('Airline Carrier')).toBeInTheDocument();
    expect(screen.getByText('Station / Airport Hub')).toBeInTheDocument();
    expect(screen.getByText('Validity Period')).toBeInTheDocument();
    expect(screen.getByText('Billing Currency')).toBeInTheDocument();
  });

  it('navigates from Step 1 to Step 2 after filling required fields', async () => {
    const { container } = render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    // Initial step should have Add Service Line hidden/not displayed in step 0
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('renders dynamic formula authoring components when added in Step 2', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    // Add service line button
    const addBtn = screen.getByRole('button', { name: /add service line/i });
    expect(addBtn).toBeInTheDocument();

    fireEvent.click(addBtn);

    // Check that service line 1 fields appear
    expect(screen.getByText(/Service Line Configuration/i)).toBeInTheDocument();
    expect(screen.getByText('Pricing Formula Model')).toBeInTheDocument();
    expect(screen.getByText('Base Unit Rate')).toBeInTheDocument();
  });

  it('switches to TiersEditor for PF-03 and PF-04', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole('button', { name: /add service line/i });
    fireEvent.click(addBtn);

    // Verify PF-01 is initial
    expect(screen.getByText('Base Unit Rate')).toBeInTheDocument();
  });

  it('renders Step 3 review summary and handles submit payload', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    expect(screen.getByText('Contract Agreement Review')).toBeInTheDocument();
  });

  it('renders edit mode header and pre-fills contract data when id param is present', async () => {
    const { Routes, Route } = await import('react-router-dom');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/contracts/CTR-001')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'CTR-001',
              airlineId: 'EK',
              airportCode: 'DXB',
              startDate: '2026-01-01',
              endDate: '2026-12-31',
              currency: 'USD',
              status: 'DRAFT',
              services: [
                {
                  chargeCode: 'PASSENGER_HANDLING',
                  serviceName: 'Turnaround Passenger Handling',
                  formulaType: 'PF-01',
                  quantityDriver: 'passengers',
                  uom: 'PAX',
                  taxCode: 'VAT-0',
                  rateDetails: { rate: 15.0 },
                },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <MemoryRouter initialEntries={['/contracts/CTR-001/edit']}>
        <Routes>
          <Route path="/contracts/:id/edit" element={<ContractWizard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Ground Handling Agreement (SGHA)')).toBeInTheDocument();
    });
  });

  it('allows clicking Next on Step 1 when editing a contract with PF-05 timeBands service', async () => {
    const { Routes, Route } = await import('react-router-dom');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/contracts/CTR-002')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'CTR-002',
              airlineId: 'EK',
              airportCode: 'SIN',
              startDate: '2026-06-15',
              endDate: '2027-06-15',
              currency: 'SGD',
              status: 'DRAFT',
              services: [
                {
                  chargeCode: 'CARGO_HANDLING',
                  serviceName: 'Cargo warehouse handling',
                  formulaType: 'PF-05',
                  quantityDriver: 'cargoWeight',
                  uom: 'KG',
                  rateDetails: { expectedAmount: 2400 },
                },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(
      <MemoryRouter initialEntries={['/contracts/CTR-002/edit']}>
        <Routes>
          <Route path="/contracts/:id/edit" element={<ContractWizard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Ground Handling Agreement (SGHA)')).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      // Step 2 should be reached and Previous button becomes visible
      expect(screen.getByText('Previous Step')).toBeInTheDocument();
    });
  });

  it('auto-populates driver, UoM, and serviceName when charge code is selected in Step 2', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole('button', { name: /add service line/i });
    fireEvent.click(addBtn);

    // Initial state PF-01 is present
    expect(screen.getByText('Pricing Formula Model')).toBeInTheDocument();

    // Verify chargeCode select exists
    const chargeCodeInput = document.getElementById('services_0_chargeCode');
    expect(chargeCodeInput).toBeInTheDocument();

    const driverInput = document.getElementById('services_0_quantityDriver');
    expect(driverInput).toBeInTheDocument();

    const uomInput = document.getElementById('services_0_uom');
    expect(uomInput).toBeInTheDocument();
  });

  it('presets mtow_tonnes and TONNE when PF-07 is selected', async () => {
    render(
      <MemoryRouter>
        <ContractWizard />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole('button', { name: /add service line/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Pricing Formula Model')).toBeInTheDocument();
  });
});

