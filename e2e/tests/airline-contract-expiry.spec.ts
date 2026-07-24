import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
};

const airlineHeaders = {
  'Content-Type': 'application/json',
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

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const plusDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

test('airline views approaching contract expiries in table and geographic map', async ({ page }) => {
  const suffix = Date.now();
  const supplierA = `AOR1A${suffix}`;
  const supplierB = `AOR1B${suffix}`;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  const provisionSupplier = async (supplierId: string) => {
    const createTenant = await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: supplierId, name: supplierId, type: 'GROUND_HANDLER' },
    });
    expect(createTenant.status()).toBe(201);
    const createUser = await page.request.post(`/api/tenants/${supplierId}/users`, {
      headers: platformHeaders,
      data: {
        id: `dev-${supplierId}`,
        username: `dev-${supplierId}`,
        email: `${supplierId.toLowerCase()}@local.invalid`,
        roles: ['ADMIN', 'CONTRACT_ENTRY', 'CONTRACT_APPROVER'],
        airportRestrictions: [],
        airlineRestrictions: [],
        chargeCodeRestrictions: [],
      },
    });
    expect(createUser.status()).toBe(201);
  };

  const createApprovedContract = async (
    supplierId: string,
    airportCode: string,
    serviceType: string,
    daysUntilExpiry: number,
  ) => {
    const response = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode,
        startDate: isoDate(plusDays(today, -30)),
        endDate: isoDate(plusDays(today, daysUntilExpiry)),
        currency: 'USD',
        services: [{
          chargeCode: serviceType,
          serviceName: `Phase 8.5 ${serviceType}`,
          formulaType: 'PF-01',
          quantityDriver: 'events',
          uom: 'EA',
          taxCode: 'VAT-0',
          rateDetails: { rate: 25 },
        }],
      },
    });
    expect(response.status()).toBe(201);
    const contract = await response.json();
    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      });
      expect(transition.ok()).toBeTruthy();
    }
    return contract;
  };

  await provisionSupplier(supplierA);
  await provisionSupplier(supplierB);
  const urgentContract = await createApprovedContract(
    supplierA, 'DXB', 'BAGGAGE', 10,
  );
  await createApprovedContract(supplierB, 'LHR', 'CLEANING', 45);
  await createApprovedContract(supplierA, 'FRA', 'RAMP_HANDLING', 120);

  const reportResponse = await page.request.get(
    `/api/airline/reports/contract-expiry?supplierId=${supplierA}`
      + '&airportCode=DXB&serviceType=BAGGAGE&horizonDays=90',
    { headers: airlineHeaders },
  );
  expect(reportResponse.ok()).toBeTruthy();
  const report = await reportResponse.json();
  expect(report.summary).toEqual({
    totalContracts: 1,
    expiringWithin30Days: 1,
    expiringWithin60Days: 0,
    expiringAfter60Days: 0,
    airportCount: 1,
  });
  expect(report.airports).toEqual([expect.objectContaining({
    airportCode: 'DXB',
    contractCount: 1,
    nearestExpiryDays: expect.any(Number),
    latitude: 25.249790,
    longitude: 55.370992,
    suppliers: [supplierA],
    serviceTypes: ['BAGGAGE'],
  })]);
  expect(report.contracts).toEqual([expect.objectContaining({
    contractId: urgentContract.id,
    supplierId: supplierA,
    airportCode: 'DXB',
    daysRemaining: expect.any(Number),
    urgency: 'URGENT',
    serviceTypes: ['BAGGAGE'],
  })]);

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', {
    name: 'Contracts Approaching Expiry',
  })).toBeVisible();

  const supplierFilter = page.getByTestId('aor1-supplier-filter');
  await supplierFilter.click();
  await supplierFilter.getByRole('combobox').fill(supplierA);
  const supplierReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/airline/reports/contract-expiry')
      && response.url().includes(`supplierId=${supplierA}`));
  await page.locator('.ant-select-item-option-content').filter({ hasText: supplierA }).click();
  await supplierReport;

  await expect(page.getByTestId('aor1-total-contracts')).toContainText('1');
  await expect(page.getByTestId('aor1-urgent-contracts')).toContainText('1');
  await expect(page.getByTestId('aor1-airport-count')).toContainText('1');
  const marker = page.getByTestId('aor1-map-DXB');
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute(
    'aria-label',
    'DXB, 1 expiring contracts',
  );

  const airportReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/airline/reports/contract-expiry')
      && response.url().includes('airportCode=DXB'));
  await marker.click();
  await airportReport;

  const table = page.getByTestId('aor1-contract-table');
  const row = table.getByRole('row').filter({ hasText: supplierA });
  await expect(row).toContainText('DXB');
  await expect(row).toContainText('BAGGAGE');
  await expect(row).toContainText(/\d+ days/);
  await expect(table).not.toContainText(supplierB);

  await row.getByRole('button', { name: 'View' }).click();
  await expect(page).toHaveURL(/\/airline\/contracts\?airportCode=DXB$/);
});
