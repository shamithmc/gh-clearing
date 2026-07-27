import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
};

const airlineHeaders = {
  'X-Mock-Tenant-Id': 'EK',
  'X-Mock-Tenant-Type': 'AIRLINE',
  'X-Mock-User-Id': 'dev-EK',
};

const supplierHeaders = (supplierId: string) => ({
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': supplierId,
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': `dev-${supplierId}`,
});

test('airline sees only confidentiality-safe airport cost index segments', async ({ page }) => {
  const dnata = await page.request.get('/api/tenants/DNATA', { headers: platformHeaders });
  if (dnata.status() === 404) {
    const createTenant = await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: 'DNATA', name: 'dnata', type: 'GROUND_HANDLER' },
    });
    expect(createTenant.status()).toBe(201);
  }

  const dnataUser = await page.request.get('/api/tenants/DNATA/users/dev-DNATA', {
    headers: platformHeaders,
  });
  if (dnataUser.status() === 404) {
    const createUser = await page.request.post('/api/tenants/DNATA/users', {
      headers: platformHeaders,
      data: {
        id: 'dev-DNATA',
        username: 'dev-DNATA',
        email: 'dev-dnata@local.invalid',
        roles: ['ADMIN', 'CONTRACT_ENTRY', 'CONTRACT_APPROVER', 'INVOICE_ENTRY', 'INVOICE_APPROVER'],
        airportRestrictions: [],
        airlineRestrictions: [],
        chargeCodeRestrictions: [],
      },
    });
    expect(createUser.status()).toBe(201);
  }

  const suffix = Date.now();
  const aircraftType = `TEST-${suffix}`;
  const createDispatchedInvoice = async (
    supplierId: string,
    rate: number,
    includePrivateCleaningSegment: boolean,
  ) => {
    const services = [{
      chargeCode: 'BAGGAGE',
      serviceName: 'Phase 8.1 Baggage',
      formulaType: 'PF-01',
      quantityDriver: 'bags',
      uom: 'EA',
      taxCode: 'VAT-0',
      rateDetails: { rate },
    }];
    if (includePrivateCleaningSegment) {
      services.push({
        chargeCode: 'CLEANING',
        serviceName: 'Phase 8.1 Cleaning',
        formulaType: 'PF-01',
        quantityDriver: 'aircraft',
        uom: 'EA',
        taxCode: 'VAT-0',
        rateDetails: { rate: 75 },
      });
    }

    const contractResponse = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode: 'DXB',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'USD',
        services,
      },
    });
    expect(contractResponse.status()).toBe(201);
    const contract = await contractResponse.json();

    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      });
      expect(transition.ok()).toBeTruthy();
    }

    const lineItems = [{
      flightDate: '2026-07-02',
      flightNumber: `EK${supplierId === 'DNATA' ? '202' : '101'}`,
      aircraftReg: `A6-${supplierId.slice(0, 3)}`,
      aircraftType,
      origin: 'DXB',
      destination: 'FRA',
      chargeCode: 'BAGGAGE',
      serviceName: 'Phase 8.1 Baggage',
      formulaType: 'PF-01',
      quantityDrivers: JSON.stringify({ bags: 10 }),
      calculatedAmount: 0,
      contractId: contract.id,
    }];
    if (includePrivateCleaningSegment) {
      lineItems.push({
        flightDate: '2026-07-02',
        flightNumber: 'EK101',
        aircraftReg: 'A6-SWI',
        aircraftType,
        origin: 'DXB',
        destination: 'FRA',
        chargeCode: 'CLEANING',
        serviceName: 'Phase 8.1 Cleaning',
        formulaType: 'PF-01',
        quantityDrivers: JSON.stringify({ aircraft: 1 }),
        calculatedAmount: 0,
        contractId: contract.id,
      });
    }

    const invoiceResponse = await page.request.post('/api/invoices', {
      headers: supplierHeaders(supplierId),
      data: {
        invoiceNumber: `COST-${supplierId}-${suffix}`,
        supplierId,
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'USD',
        exchangeRate: 1,
        exchangeRateSource: 'Phase 8.1 E2E',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        totalAmount: 0,
        lineItems,
      },
    });
    expect(invoiceResponse.status()).toBe(201);
    const invoice = await invoiceResponse.json();

    for (const status of ['FINALIZED', 'APPROVED', 'SENT']) {
      const transition = await page.request.put(`/api/invoices/${invoice.id}/status?status=${status}`, {
        headers: supplierHeaders(supplierId),
      });
      expect(transition.ok()).toBeTruthy();
    }
  };

  await createDispatchedInvoice('SWISSPORT', 10, true);

  const beforeThreshold = await page.request.get(
    `/api/market-intelligence/airport-cost-index?airportCode=DXB&aircraftType=${aircraftType}`,
    { headers: airlineHeaders },
  );
  expect(beforeThreshold.ok()).toBeTruthy();
  expect(await beforeThreshold.json()).toEqual([]);

  await createDispatchedInvoice('DNATA', 14, false);

  const indexResponse = await page.request.get(
    `/api/market-intelligence/airport-cost-index?airportCode=DXB&serviceType=BAGGAGE&aircraftType=${aircraftType}&operationType=INTERNATIONAL`,
    { headers: airlineHeaders },
  );
  expect(indexResponse.ok()).toBeTruthy();
  const index = await indexResponse.json();
  expect(index).toEqual(expect.arrayContaining([expect.objectContaining({
    airportCode: 'DXB',
    region: 'MIDDLE_EAST',
    serviceType: 'BAGGAGE',
    aircraftType,
    operationType: 'INTERNATIONAL',
    currency: 'USD',
    averageCost: 120,
    observationCount: 2,
  })]));
  expect(JSON.stringify(index)).not.toContain('SWISSPORT');
  expect(JSON.stringify(index)).not.toContain('DNATA');

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Cost Index' }).click();

  await expect(page).toHaveURL(/\/airline\/cost-index$/);
  await expect(page.getByRole('heading', { name: 'Airport Cost Index' })).toBeVisible();
  const aircraftFilter = page.getByTestId('cost-index-aircraft-filter');
  await aircraftFilter.click();
  await aircraftFilter.getByRole('combobox').fill(aircraftType);
  await aircraftFilter.getByRole('combobox').press('Enter');
  const costIndexTable = page.getByTestId('airport-cost-index-table');
  const baggageRow = costIndexTable.getByRole('row')
    .filter({ hasText: aircraftType })
    .filter({ hasText: 'Baggage Handling' });
  await expect(baggageRow).toContainText('DXB');
  await expect(baggageRow).toContainText(aircraftType);
  await expect(baggageRow).toContainText('INTERNATIONAL');
  await expect(baggageRow).toContainText('USD 120.00');
  await expect(costIndexTable.getByRole('row')
    .filter({ hasText: aircraftType })
    .filter({ hasText: 'CLEANING' })).toHaveCount(0);
  await expect(page.getByText('SWISSPORT')).toHaveCount(0);
  await expect(page.getByText('DNATA')).toHaveCount(0);
});
