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

test('airline sees its premium market position without competitor rates', async ({ page }) => {
  const dnata = await page.request.get('/api/tenants/DNATA', { headers: platformHeaders });
  if (dnata.status() === 404) {
    const createTenant = await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: 'DNATA', name: 'dnata', type: 'GROUND_HANDLER' },
    });
    expect(createTenant.status()).toBe(201);
  }

  const lufthansa = await page.request.get('/api/tenants/LH', { headers: platformHeaders });
  if (lufthansa.status() === 404) {
    const createAirline = await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: 'LH', name: 'Lufthansa', type: 'AIRLINE' },
    });
    expect(createAirline.status()).toBe(201);
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

  let suffix = Date.now().toString();
  while (suffix.includes('100')) {
    suffix = (Date.now() + Math.floor(Math.random() * 1000)).toString();
  }
  const aircraftType = `BENCH-${suffix}`;

  const createDispatchedInvoice = async (
    supplierId: string,
    billedAirlineId: string,
    rate: number,
  ) => {
    const contractResponse = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: billedAirlineId,
        airportCode: 'DXB',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'USD',
        services: [{
          chargeCode: 'BAGGAGE',
          serviceName: 'Phase 8.2 Baggage',
          formulaType: 'PF-01',
          quantityDriver: 'bags',
          uom: 'EA',
          taxCode: 'VAT-0',
          rateDetails: { rate },
        }],
      },
    });
    const contract = await contractResponse.json();
    expect(contractResponse.status(), JSON.stringify(contract)).toBe(201);

    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      });
      expect(transition.ok()).toBeTruthy();
    }

    const invoiceResponse = await page.request.post('/api/invoices', {
      headers: supplierHeaders(supplierId),
      data: {
        invoiceNumber: `BENCH-${supplierId}-${suffix}`,
        supplierId,
        airlineId: billedAirlineId,
        airportCode: 'DXB',
        currency: 'USD',
        exchangeRate: 1,
        exchangeRateSource: 'Phase 8.2 E2E',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        totalAmount: 0,
        lineItems: [{
          flightDate: '2026-07-02',
          flightNumber: billedAirlineId === 'EK' ? 'EK202' : 'LH601',
          aircraftReg: `A6-${supplierId.slice(0, 3)}`,
          aircraftType,
          origin: 'DXB',
          destination: 'FRA',
          chargeCode: 'BAGGAGE',
          serviceName: 'Phase 8.2 Baggage',
          formulaType: 'PF-01',
          quantityDrivers: JSON.stringify({ bags: 10 }),
          calculatedAmount: 0,
          contractId: contract.id,
        }],
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

  await createDispatchedInvoice('SWISSPORT', 'LH', 10);

  const beforeThreshold = await page.request.get(
    `/api/market-intelligence/pricing-benchmarks?aircraftType=${aircraftType}`,
    { headers: airlineHeaders },
  );
  expect(beforeThreshold.ok()).toBeTruthy();
  expect(await beforeThreshold.json()).toEqual([]);

  await createDispatchedInvoice('DNATA', 'EK', 14);

  const response = await page.request.get(
    `/api/market-intelligence/pricing-benchmarks?airportCode=DXB&serviceType=BAGGAGE&aircraftType=${aircraftType}&operationType=INTERNATIONAL`,
    { headers: airlineHeaders },
  );
  expect(response.ok()).toBeTruthy();
  const benchmarks = await response.json();
  expect(benchmarks).toEqual([expect.objectContaining({
    airportCode: 'DXB',
    region: 'MIDDLE_EAST',
    serviceType: 'BAGGAGE',
    aircraftType,
    operationType: 'INTERNATIONAL',
    currency: 'USD',
    airlineAverageCost: 140,
    airlineObservationCount: 1,
    marketPosition: 'TOP_25_PERCENT_PREMIUM',
  })]);
  expect(JSON.stringify(benchmarks)).not.toContain('SWISSPORT');
  expect(JSON.stringify(benchmarks)).not.toContain('DNATA');
  expect(JSON.stringify(benchmarks)).not.toContain('100');

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Cost Index' }).click();
  await expect(page).toHaveURL(/\/airline\/cost-index$/);
  await expect(page.getByRole('heading', { name: 'Pricing Benchmark' })).toBeVisible();

  const aircraftFilter = page.getByTestId('benchmark-aircraft-filter');
  await aircraftFilter.click();
  await aircraftFilter.getByRole('combobox').fill(aircraftType);
  await aircraftFilter.getByRole('combobox').press('Enter');

  const benchmarkTable = page.getByTestId('pricing-benchmark-table');
  const row = benchmarkTable.getByRole('row').filter({ hasText: aircraftType });
  await expect(row).toContainText('DXB');
  await expect(row).toContainText('USD 140.00');
  await expect(row).toContainText('Top 25% — Premium');
  await expect(benchmarkTable.getByText('USD 100.00')).toHaveCount(0);
  await expect(benchmarkTable.getByText('SWISSPORT')).toHaveCount(0);
  await expect(benchmarkTable.getByText('DNATA')).toHaveCount(0);

  const positionFilter = page.getByTestId('benchmark-position-filter');
  await positionFilter.click();
  await positionFilter.getByRole('combobox').fill('Top 25% — Premium');
  await positionFilter.getByRole('combobox').press('Enter');
  await expect(row).toBeVisible();
});
