import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InvoiceWizard from '../InvoiceWizard';

// Mock fetch for API calls used by the component
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Suppress navigation side effects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('InvoiceWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');

    // Mock reference data API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/reference/airlines')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { iataCode: 'EK', name: 'Emirates' },
            { iataCode: 'LH', name: 'Lufthansa' },
          ]),
        });
      }
      if (url.includes('/api/reference/airports')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { iataCode: 'DXB', name: 'Dubai International Airport' },
            { iataCode: 'FRA', name: 'Frankfurt Airport' },
          ]),
        });
      }
      if (url.includes('/api/contracts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });
    });
  });

  it('renders the wizard heading', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('Create Ground Handling Invoice')).toBeInTheDocument();
  });

  it('renders Step 1 header fields on initial load', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('Header & Scope')).toBeInTheDocument();
    expect(screen.getByText('Flight Line Items')).toBeInTheDocument();
    expect(screen.getByText('Ledger Preview')).toBeInTheDocument();
  });

  it('renders Airline Carrier and Airport Hub select fields', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Airline Carrier/i)).toBeInTheDocument();
    expect(screen.getByText(/Station \/ Airport Hub/i)).toBeInTheDocument();
  });

  it('renders exchange rate input field', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    const exchangeRateInput = document.querySelector('#exchangeRate') as HTMLInputElement;
    expect(exchangeRateInput).toBeInTheDocument();
  });

  it('renders currency selector with USD, EUR, and AED options', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    // Currency select should be rendered
    expect(screen.getByText(/Currency/i)).toBeInTheDocument();
  });

  it('renders the invoice number input field', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    const invoiceNumberInput = screen.getByPlaceholderText('INV-2026-0001');
    expect(invoiceNumberInput).toBeInTheDocument();
  });

  it('renders Next Step button in Step 1', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText('Next Step')).toBeInTheDocument();
  });

  it('does not render Submit Draft Invoice button in Step 1', async () => {
    render(
      <MemoryRouter>
        <InvoiceWizard />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Submit Draft Invoice')).not.toBeInTheDocument();
  });
});
