import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
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

test('supplier explores operational footprint with airline and service dimensions', async ({ page }) => {
  const supplierId = `SOR2${Date.now()}`;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  expect((await page.request.post('/api/tenants', {
    headers: platformHeaders,
    data: { id: supplierId, name: supplierId, type: 'GROUND_HANDLER' },
  })).status()).toBe(201);
  expect((await page.request.post(`/api/tenants/${supplierId}/users`, {
    headers: platformHeaders,
    data: {
      id: `dev-${supplierId}`,
      username: `dev-${supplierId}`,
      email: `${supplierId.toLowerCase()}@local.invalid`,
      roles: ['ADMIN', 'CONTRACT_ENTRY', 'CONTRACT_APPROVER', 'MIS_VIEWER'],
      airportRestrictions: [],
      airlineRestrictions: [],
      chargeCodeRestrictions: [],
    },
  })).status()).toBe(201);

  const createContract = async (
    airportCode: string,
    serviceType: string,
    currency: string,
    expectedAmount: number,
  ) => {
    const response = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode,
        startDate: isoDate(plusDays(today, -30)),
        endDate: isoDate(plusDays(today, 90)),
        currency,
        services: [{
          chargeCode: serviceType,
          serviceName: `Phase 8.7 ${serviceType}`,
          formulaType: 'PF-01',
          quantityDriver: 'events',
          uom: 'EA',
          billingFrequency: 'MONTHLY',
          rateDetails: { rate: 20, expectedAmount },
        }],
      },
    });
    expect(response.status()).toBe(201);
    const contract = await response.json();
    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      expect((await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      })).ok()).toBeTruthy();
    }
    return contract;
  };

  const dxbContract = await createContract('DXB', 'BAGGAGE', 'USD', 200);
  await createContract('LHR', 'CLEANING', 'EUR', 150);

  const reportResponse = await page.request.get(
    '/api/supplier/reports/operational-footprint'
      + '?airlineId=EK&airportCode=DXB&serviceType=BAGGAGE&currency=USD',
    { headers: supplierHeaders(supplierId) },
  );
  expect(reportResponse.ok()).toBeTruthy();
  const report = await reportResponse.json();
  expect(report.summary).toEqual({
    airportCount: 1,
    airlineCount: 1,
    serviceCount: 1,
    activeContractCount: 1,
  });
  expect(report.airports).toEqual([expect.objectContaining({
    airportCode: 'DXB',
    airlines: ['EK'],
    serviceTypes: ['BAGGAGE'],
    monthlyValues: [{ currency: 'USD', monthlyExpectedValue: 200 }],
    contractCount: 1,
  })]);
  expect(report.contracts).toEqual([expect.objectContaining({
    contractId: dxbContract.id,
    airlineId: 'EK',
    services: [expect.objectContaining({
      serviceType: 'BAGGAGE',
      monthlyExpectedValue: 200,
    })],
  })]);

  await page.addInitScript(id => {
    localStorage.setItem('simTenantId', id);
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', `dev-${id}`);
  }, supplierId);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Operational Footprint' })).toBeVisible();

  const airlineFilter = page.getByTestId('sor2-airline-filter');
  await airlineFilter.click();
  const filteredReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/supplier/reports/operational-footprint')
      && response.url().includes('airlineId=EK'));
  await page.locator('.ant-select-item-option-content').filter({ hasText: 'EK' }).click();
  await filteredReport;

  await expect(page.getByTestId('sor2-airports')).toContainText('2');
  await expect(page.getByTestId('sor2-airlines')).toContainText('1');
  await expect(page.getByTestId('sor2-services')).toContainText('2');
  await expect(page.getByTestId('sor2-contracts')).toContainText('2');

  const marker = page.getByTestId('sor2-map-DXB');
  await marker.hover();
  const hoverCard = page.getByTestId('sor2-hover-DXB');
  await expect(hoverCard).toContainText('EK');
  await expect(hoverCard).toContainText('BAGGAGE');
  await expect(hoverCard).toContainText('USD 200.00');

  await marker.click();
  const table = page.getByTestId('sor2-contract-table');
  const row = table.getByRole('row').filter({ hasText: 'BAGGAGE' });
  await expect(row).toContainText('DXB');
  await expect(row).toContainText('EK');
  await expect(row).toContainText('USD 200.00');
  await expect(table).not.toContainText('CLEANING');
});
