import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '../UserManagement';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const swissportUsers = [
  {
    id: 'gh-admin',
    tenantId: 'SWISSPORT',
    username: 'Swissport Admin',
    email: 'admin@swissport.test',
    roles: ['ADMIN', 'GROUND_HANDLER_ADMIN'],
    airportRestrictions: [],
    airlineRestrictions: [],
    chargeCodeRestrictions: [],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'gh-operator',
    tenantId: 'SWISSPORT',
    username: 'Swissport Operator',
    email: 'operator@swissport.test',
    roles: ['CONTRACT_ENTRY', 'INVOICE_ENTRY'],
    airportRestrictions: ['DXB'],
    airlineRestrictions: ['EK'],
    chargeCodeRestrictions: ['BAGGAGE'],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const mockAirports = [{ iataCode: 'DXB', name: 'Dubai International' }];
const mockAirlines = [{ iataCode: 'EK', name: 'Emirates' }];
const mockChargeCodes = [{ code: 'BAGGAGE', displayName: 'Baggage Handling' }];

const setupStandardMock = () => {
  mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    if (url.includes('/api/reference/airports')) return Promise.resolve(jsonResponse(mockAirports));
    if (url.includes('/api/reference/airlines')) return Promise.resolve(jsonResponse(mockAirlines));
    if (url.includes('/api/reference/charge-codes')) return Promise.resolve(jsonResponse(mockChargeCodes));
    if (url.includes('/api/tenants/SWISSPORT/users') && (!init?.method || init.method.toUpperCase() === 'GET')) {
      return Promise.resolve(jsonResponse(swissportUsers));
    }
    throw new Error(`Unhandled mock for ${url}`);
  });
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
  });

  it('renders user list for ground-handler admin with role and ABAC scopes', async () => {
    setupStandardMock();

    render(<UserManagement />);

    expect(screen.getByText('User & Role Administration')).toBeInTheDocument();
    expect(await screen.findByText('Swissport Admin')).toBeInTheDocument();
    expect(screen.getByText('Swissport Operator')).toBeInTheDocument();
    expect(screen.getByText('gh-admin')).toBeInTheDocument();
    expect(screen.getByText('gh-operator')).toBeInTheDocument();
    expect(screen.getByText('Global Tenant Scope')).toBeInTheDocument();
    expect(screen.getByText('1 Airport')).toBeInTheDocument();
  });

  it('filters users by search input', async () => {
    setupStandardMock();
    const user = userEvent.setup();

    render(<UserManagement />);
    await screen.findByText('Swissport Admin');

    const searchInput = screen.getByTestId('user-search-input');
    await user.type(searchInput, 'operator');

    expect(screen.queryByText('Swissport Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Swissport Operator')).toBeInTheDocument();
  });

  it('provisions a new user with roles and dimensional restrictions', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/api/reference/airports')) return Promise.resolve(jsonResponse(mockAirports));
      if (url.includes('/api/reference/airlines')) return Promise.resolve(jsonResponse(mockAirlines));
      if (url.includes('/api/reference/charge-codes')) return Promise.resolve(jsonResponse(mockChargeCodes));
      if (url.includes('/api/tenants/SWISSPORT/users') && (!init?.method || init.method.toUpperCase() === 'GET')) {
        return Promise.resolve(jsonResponse(swissportUsers));
      }
      if (url.includes('/api/tenants/SWISSPORT/users') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(
          jsonResponse({
            id: body.id,
            tenantId: 'SWISSPORT',
            username: body.username,
            email: body.email,
            roles: body.roles,
            airportRestrictions: body.airportRestrictions,
            airlineRestrictions: body.airlineRestrictions,
            chargeCodeRestrictions: body.chargeCodeRestrictions,
            createdAt: '2026-08-17T00:00:00Z',
          }),
        );
      }
      throw new Error(`Unhandled mock for ${url}`);
    });

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Swissport Admin');

    await user.click(screen.getByTestId('provision-user-button'));
    expect(screen.getByText(/Provision User — SWISSPORT/)).toBeInTheDocument();

    await user.type(screen.getByTestId('new-user-id-input'), 'new-lead');
    await user.type(screen.getByTestId('new-user-name-input'), 'Jane Lead');
    await user.type(screen.getByTestId('new-user-email-input'), 'jlead@swissport.test');

    // Select role via antd select
    const rolesSelect = screen.getByTestId('new-user-roles-select');
    fireEvent.mouseDown(rolesSelect.querySelector('.ant-select-selector')!);
    const dropdownOption = document.querySelector('.ant-select-item-option-content');
    if (dropdownOption) {
      fireEvent.click(dropdownOption);
    }

    await user.click(screen.getByTestId('submit-new-user-button'));

    expect(await screen.findByText('User "Jane Lead" (new-lead) provisioned successfully.')).toBeInTheDocument();
    expect(await screen.findByText('Jane Lead')).toBeInTheDocument();
  });

  it('edits an existing user', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/api/reference/airports')) return Promise.resolve(jsonResponse(mockAirports));
      if (url.includes('/api/reference/airlines')) return Promise.resolve(jsonResponse(mockAirlines));
      if (url.includes('/api/reference/charge-codes')) return Promise.resolve(jsonResponse(mockChargeCodes));
      if (url.includes('/api/tenants/SWISSPORT/users/gh-operator') && init?.method === 'PUT') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(
          jsonResponse({
            id: 'gh-operator',
            tenantId: 'SWISSPORT',
            username: body.username,
            email: body.email,
            roles: body.roles,
            airportRestrictions: body.airportRestrictions,
            airlineRestrictions: body.airlineRestrictions,
            chargeCodeRestrictions: body.chargeCodeRestrictions,
            createdAt: '2026-01-01T00:00:00Z',
          }),
        );
      }
      if (url.includes('/api/tenants/SWISSPORT/users') && (!init?.method || init.method.toUpperCase() === 'GET')) {
        return Promise.resolve(jsonResponse(swissportUsers));
      }
      throw new Error(`Unhandled mock for ${url}`);
    });

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText('Swissport Operator');

    await user.click(screen.getByTestId('edit-user-gh-operator'));
    expect(screen.getByText('Edit User: gh-operator')).toBeInTheDocument();

    const nameInput = screen.getByTestId('edit-user-name-input');
    fireEvent.change(nameInput, { target: { value: 'Senior Operator' } });

    await user.click(screen.getByTestId('submit-edit-user-button'));

    expect(await screen.findByText('User "Senior Operator" updated successfully.')).toBeInTheDocument();
  });
});
