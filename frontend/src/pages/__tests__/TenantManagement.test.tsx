import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TenantManagement from '../TenantManagement';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const tenantsList = [
  {
    id: 'EK',
    name: 'Emirates',
    type: 'AIRLINE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SWISSPORT',
    name: 'Swissport',
    type: 'GROUND_HANDLER',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

describe('TenantManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('simTenantId', 'PLATFORM');
    localStorage.setItem('simTenantType', 'PLATFORM_ADMIN');
  });

  it('renders tenant list for platform admin', async () => {
    mockFetch.mockResolvedValue(jsonResponse(tenantsList));

    render(<TenantManagement />);

    expect(screen.getByText('Tenant Management')).toBeInTheDocument();
    expect(await screen.findByText('Emirates')).toBeInTheDocument();
    expect(screen.getByText('Swissport')).toBeInTheDocument();
    expect(screen.getByText('EK')).toBeInTheDocument();
    expect(screen.getByText('SWISSPORT')).toBeInTheDocument();
  });

  it('filters tenants by type and search query', async () => {
    mockFetch.mockResolvedValue(jsonResponse(tenantsList));
    const user = userEvent.setup();

    render(<TenantManagement />);
    await screen.findByText('Emirates');

    // Filter by type (click label)
    fireEvent.click(screen.getByText(/Airlines \(1\)/));
    expect(screen.getByText('Emirates')).toBeInTheDocument();
    expect(screen.queryByText('Swissport')).not.toBeInTheDocument();

    // Reset filter
    fireEvent.click(screen.getByText(/All \(2\)/));
    expect(screen.getByText('Swissport')).toBeInTheDocument();

    const searchInput = screen.getByTestId('tenant-search-input');
    await user.type(searchInput, 'Swiss');
    expect(screen.queryByText('Emirates')).not.toBeInTheDocument();
    expect(screen.getByText('Swissport')).toBeInTheDocument();
  });

  it('opens modal, validates input, and provisions a new tenant', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/api/tenants') && (!init?.method || init.method.toUpperCase() === 'GET')) {
        return Promise.resolve(jsonResponse(tenantsList));
      }
      if (url.includes('/api/tenants') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(
          jsonResponse({
            id: body.id,
            name: body.name,
            type: body.type,
            status: 'ACTIVE',
            createdAt: '2026-08-17T00:00:00Z',
          }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const user = userEvent.setup();
    render(<TenantManagement />);
    await screen.findByText('Emirates');

    await user.click(screen.getByTestId('add-tenant-button'));
    expect(screen.getByText('Provision New Tenant')).toBeInTheDocument();

    await user.type(screen.getByTestId('new-tenant-id-input'), 'LH');
    await user.type(screen.getByTestId('new-tenant-name-input'), 'Lufthansa');
    await user.click(screen.getByTestId('submit-new-tenant-button'));

    expect(await screen.findByText('Tenant "Lufthansa" (LH) created successfully.')).toBeInTheDocument();
    expect(await screen.findByText('Lufthansa')).toBeInTheDocument();
  });

  it('shows error message when creation fails', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes('/api/tenants') && (!init?.method || init.method.toUpperCase() === 'GET')) {
        return Promise.resolve(jsonResponse(tenantsList));
      }
      if (url.includes('/api/tenants') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ detail: "Tenant with id 'EK' already exists" }, 409));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const user = userEvent.setup();
    render(<TenantManagement />);
    await screen.findByText('Emirates');

    await user.click(screen.getByTestId('add-tenant-button'));
    await user.type(screen.getByTestId('new-tenant-id-input'), 'EK');
    await user.type(screen.getByTestId('new-tenant-name-input'), 'Emirates Copy');
    await user.click(screen.getByTestId('submit-new-tenant-button'));

    expect(await screen.findByText("Tenant with id 'EK' already exists")).toBeInTheDocument();
  });

  it('blocks non-platform personas with 403 Access Denied', () => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');

    render(<TenantManagement />);

    expect(screen.getByText('Tenant administration access denied')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
