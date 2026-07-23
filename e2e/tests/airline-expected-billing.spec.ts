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

test('airline explores contract-frequency projections and drills down by date', async ({ page }) => {
  const suffix = Date.now();
  const supplierA = `AFR2A${suffix}`;
  const supplierB = `AFR2B${suffix}`;
  const start = new Date();
  start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 14);
  const secondOccurrence = new Date(start);
  secondOccurrence.setUTCDate(secondOccurrence.getUTCDate() + 7);

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
    currency: string,
    frequency: string,
    expectedAmount: number,
  ) => {
    const response = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode,
        startDate: isoDate(start),
        endDate: isoDate(end),
        currency,
        services: [{
          chargeCode: serviceType,
          serviceName: `Phase 8.4 ${serviceType}`,
          formulaType: 'PF-01',
          quantityDriver: 'events',
          uom: 'EA',
          taxCode: 'VAT-0',
          billingFrequency: frequency,
          rateDetails: { rate: expectedAmount, expectedAmount },
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
  const projectedContract = await createApprovedContract(
    supplierA, 'DXB', 'BAGGAGE', 'USD', 'WEEKLY', 70,
  );
  await createApprovedContract(
    supplierB, 'FRA', 'CLEANING', 'EUR', 'DAILY', 5,
  );

  const reportResponse = await page.request.get(
    `/api/airline/reports/expected-billing?supplierId=${supplierA}`
      + `&airportCode=DXB&serviceType=BAGGAGE&startDate=${isoDate(start)}&endDate=${isoDate(end)}`,
    { headers: airlineHeaders },
  );
  expect(reportResponse.ok()).toBeTruthy();
  const report = await reportResponse.json();
  expect(report.summaries).toEqual([expect.objectContaining({
    currency: 'USD',
    totalExpected: 210,
    occurrenceCount: 3,
  })]);
  expect(report.timeline).toHaveLength(3);
  expect(report.bySupplier).toEqual([expect.objectContaining({
    key: supplierA,
    totalExpected: 210,
  })]);
  expect(report.byAirport).toEqual([expect.objectContaining({ key: 'DXB' })]);
  expect(report.byService).toEqual([expect.objectContaining({ key: 'BAGGAGE' })]);
  expect(report.projections).toEqual([
    expect.objectContaining({
      expectedDate: isoDate(start),
      contractId: projectedContract.id,
      supplierId: supplierA,
      billingFrequency: 'WEEKLY',
      expectedAmount: 70,
    }),
    expect.objectContaining({ expectedDate: isoDate(secondOccurrence) }),
    expect.objectContaining({ expectedDate: isoDate(end) }),
  ]);

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Expected Billing' })).toBeVisible();

  const supplierFilter = page.getByTestId('afr2-supplier-filter');
  await supplierFilter.click();
  await supplierFilter.getByRole('combobox').fill(supplierA);
  const filteredReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/airline/reports/expected-billing')
      && response.url().includes(`supplierId=${supplierA}`));
  await page.locator('.ant-select-item-option-content').filter({ hasText: supplierA }).click();
  await filteredReport;

  await expect(page.getByTestId('afr2-total-expected')).toContainText('USD');
  await expect(page.getByTestId('afr2-total-expected')).toContainText('210.00');
  await expect(page.getByTestId('afr2-occurrence-count')).toContainText('3');
  await expect(page.getByTestId(`afr2-supplier-${supplierA}`)).toBeVisible();
  await expect(page.getByTestId('afr2-airport-DXB')).toBeVisible();
  await expect(page.getByTestId('afr2-service-BAGGAGE')).toBeVisible();

  await page.getByTestId(`afr2-line-point-${isoDate(secondOccurrence)}`).click();
  const projectionTable = page.getByTestId('afr2-projection-table');
  await expect(projectionTable.getByRole('row')).toHaveCount(2);
  const projectionRow = projectionTable.getByRole('row').nth(1);
  await expect(projectionRow).toContainText(isoDate(secondOccurrence));
  await expect(projectionRow).toContainText(supplierA);
  await expect(projectionRow).toContainText('WEEKLY');
  await expect(projectionRow).toContainText('USD 70.00');
  await expect(projectionTable).not.toContainText(supplierB);
});
