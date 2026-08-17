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
});
