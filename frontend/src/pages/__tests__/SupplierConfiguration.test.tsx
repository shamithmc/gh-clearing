import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SupplierConfiguration from '../SupplierConfiguration';
import { canManageSupplierConfiguration } from '../../utils/supplierConfigurationAccess';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const configuration = {
  tenantId: 'SWISSPORT',
  emailIds: null,
  invoiceBackdatingDays: 30,
  regionalClassification: null,
  enabledAirlines: [],
  enabledAirports: [],
};

const successfulLoad = () => {
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes('/configuration')) return Promise.resolve(jsonResponse(configuration));
    if (url.includes('/airlines')) return Promise.resolve(jsonResponse([{ iataCode: 'EK', name: 'Emirates' }]));
    if (url.includes('/airports')) return Promise.resolve(jsonResponse([{ iataCode: 'DXB', name: 'Dubai International' }]));
    throw new Error(`Unexpected request: ${url}`);
  });
};

describe('SupplierConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
  });

  it('loads the tenant configuration and shows the empty scope state', async () => {
    successfulLoad();

    render(<SupplierConfiguration />);

    expect(screen.getByText('Loading supplier configuration')).toBeInTheDocument();
    expect(await screen.findByText('No airlines or airports are enabled yet.')).toBeInTheDocument();
    expect(screen.getByLabelText('Invoice backdating allowance (days)')).toHaveValue('30');
    expect(mockFetch).toHaveBeenCalledWith('/api/tenants/SWISSPORT/configuration', expect.any(Object));
  });

  it('shows an API error and retry action when loading fails', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'Configuration service unavailable' }, 503));

    render(<SupplierConfiguration />);

    expect(await screen.findByText('Configuration request failed')).toBeInTheDocument();
    expect(screen.getByText('Configuration service unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('requires backdating days without sending an update', async () => {
    successfulLoad();
    const user = userEvent.setup();
    render(<SupplierConfiguration />);
    await screen.findByText('No airlines or airports are enabled yet.');

    const backdating = screen.getByLabelText('Invoice backdating allowance (days)');
    fireEvent.change(backdating, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText('Enter the backdating allowance')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('saves edits and displays success', async () => {
    successfulLoad();
    const user = userEvent.setup();
    render(<SupplierConfiguration />);
    await screen.findByText('No airlines or airports are enabled yet.');
    mockFetch.mockResolvedValueOnce(jsonResponse({ ...configuration, regionalClassification: 'Middle East' }));

    await user.type(screen.getByTestId('configuration-region'), 'Middle East');
    await user.click(screen.getByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText('Supplier configuration saved successfully.')).toBeInTheDocument();
    const update = mockFetch.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(update?.[1]?.body as string)).toMatchObject({
      invoiceBackdatingDays: 30,
      regionalClassification: 'Middle East',
      enabledAirlines: [],
      enabledAirports: [],
    });
  });

  it('shows the API error when an update fails', async () => {
    successfulLoad();
    const user = userEvent.setup();
    render(<SupplierConfiguration />);
    await screen.findByText('No airlines or airports are enabled yet.');
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'Configuration update rejected' }, 409));

    await user.click(screen.getByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText('Configuration request failed')).toBeInTheDocument();
    expect(screen.getByText('Configuration update rejected')).toBeInTheDocument();
  });

  it('blocks airline personas before making API requests', () => {
    localStorage.setItem('simTenantType', 'AIRLINE');

    render(<SupplierConfiguration />);

    expect(screen.getByText('Configuration access denied')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requires an administrator role for authenticated ground-handler users', () => {
    const baseUser = {
      id: 'user-1', tenantId: 'SWISSPORT', tenantType: 'GROUND_HANDLER' as const,
      username: 'User', email: 'user@example.test',
    };

    expect(canManageSupplierConfiguration({ ...baseUser, roles: ['CONTRACT_ENTRY'] })).toBe(false);
    expect(canManageSupplierConfiguration({ ...baseUser, roles: ['GROUND_HANDLER_ADMIN'] })).toBe(true);
    expect(canManageSupplierConfiguration({ ...baseUser, roles: ['ADMIN'] })).toBe(true);
  });
});
