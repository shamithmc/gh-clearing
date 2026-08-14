import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
};

test('supplier records a flight and clears each due service exactly once', async ({ page }) => {
  const supplierId = `PINV${Date.now()}`;
  const supplierHeaders = {
    'Content-Type': 'application/json',
    'X-Mock-Tenant-Id': supplierId,
    'X-Mock-Tenant-Type': 'GROUND_HANDLER',
    'X-Mock-User-Id': `dev-${supplierId}`,
  };

  expect((await page.request.post('/api/tenants', {
    headers: platformHeaders,
    data: { id: supplierId, name: supplierId, type: 'GROUND_HANDLER' },
  })).status()).toBe(201);
  expect((await page.request.post(`/api/tenants/${supplierId}/users`, {
    headers: platformHeaders,
    data: {
      id: `dev-${supplierId}`, username: `dev-${supplierId}`,
      email: `${supplierId.toLowerCase()}@local.invalid`,
      roles: ['ADMIN', 'CONTRACT_ENTRY', 'CONTRACT_APPROVER', 'INVOICE_ENTRY', 'MIS_VIEWER'],
      airportRestrictions: [], airlineRestrictions: [], chargeCodeRestrictions: [],
    },
  })).status()).toBe(201);

  const contractResponse = await page.request.post('/api/contracts', {
    headers: supplierHeaders,
    data: {
      airlineId: 'EK', airportCode: 'DXB', startDate: '2026-08-01', endDate: '2026-12-31', currency: 'USD',
      services: [{
        chargeCode: 'BAGGAGE', serviceName: 'Baggage handling', formulaType: 'PF-01',
        quantityDriver: 'events', uom: 'EA', billingFrequency: 'DAILY', rateDetails: { rate: 20, expectedAmount: 40 },
      }],
    },
  });
  const contractBody = await contractResponse.text();
  expect(contractResponse.status(), contractBody).toBe(201);
  const contract = JSON.parse(contractBody);
  for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
    expect((await page.request.put(`/api/contracts/${contract.id}/status`, {
      headers: supplierHeaders, data: { status },
    })).ok()).toBeTruthy();
  }

  const flightId = `OF-${Date.now()}`;
  expect((await page.request.post('/api/operational-flights', {
    headers: supplierHeaders,
    data: {
      id: flightId, airlineId: 'EK', airportCode: 'DXB', flightNumber: 'EK651',
      flightDate: '2026-08-13', tailId: 'A6-EQA', aircraftType: 'A380',
      departureAirport: 'DXB', destinationAirport: 'FRA', quantityDrivers: { events: 2 },
    },
  })).status()).toBe(201);

  const pendingResponse = await page.request.get('/api/dashboard/pending-invoicing?asOfDate=2026-08-14', {
    headers: supplierHeaders,
  });
  expect(pendingResponse.ok()).toBeTruthy();
  const pending = await pendingResponse.json();
  expect(pending.summaries).toEqual([{ currency: 'USD', totalPending: 40, itemCount: 1 }]);
  expect(pending.items).toEqual([expect.objectContaining({
    operationalFlightId: flightId, serviceType: 'BAGGAGE', billingDueDate: '2026-08-13', pendingAmount: 40,
  })]);

  const invoiceData = {
    invoiceNumber: `PINV-${Date.now()}`, supplierId, airlineId: 'EK', airportCode: 'DXB', currency: 'USD',
    exchangeRate: 1, exchangeRateSource: 'Task 064 E2E', issueDate: '2026-08-14', dueDate: '2026-09-13', totalAmount: 0,
    lineItems: [{
      operationalFlightId: flightId, flightDate: '2026-08-13', flightNumber: 'EK651', aircraftReg: 'A6-EQA',
      aircraftType: 'A380', origin: 'DXB', destination: 'FRA', chargeCode: 'BAGGAGE',
      serviceName: 'Baggage handling', formulaType: 'PF-01', quantityDrivers: '{}', calculatedAmount: 0,
      contractId: contract.id,
    }],
  };
  expect((await page.request.post('/api/invoices', { headers: supplierHeaders, data: invoiceData })).status()).toBe(201);
  const cleared = await (await page.request.get('/api/dashboard/pending-invoicing?asOfDate=2026-08-14', {
    headers: supplierHeaders,
  })).json();
  expect(cleared.items).toEqual([]);

  const duplicate = await page.request.post('/api/invoices', {
    headers: supplierHeaders, data: { ...invoiceData, invoiceNumber: `${invoiceData.invoiceNumber}-DUP` },
  });
  expect(duplicate.status()).toBeGreaterThanOrEqual(400);

  await page.addInitScript(({ tenant, user }) => {
    localStorage.setItem('simTenantId', tenant);
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', user);
  }, { tenant: supplierId, user: `dev-${supplierId}` });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pending Invoicing' })).toBeVisible();
  await expect(page.getByTestId('pending-invoicing')).toContainText('No due uninvoiced services');
});
