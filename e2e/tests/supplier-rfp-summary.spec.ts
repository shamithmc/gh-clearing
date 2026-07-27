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

const supplierHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

test('supplier RFP summary retains awarded requests and shows the winning outcome', async ({ page }) => {
  const configuration = await page.request.put('/api/tenants/SWISSPORT/configuration', {
    headers: platformHeaders,
    data: {
      emailIds: 'rfp-summary@swissport.test',
      invoiceBackdatingDays: 30,
      regionalClassification: 'MIDDLE_EAST',
      enabledAirlines: ['EK'],
      enabledAirports: ['DXB'],
    },
  });
  expect(configuration.ok()).toBeTruthy();

  const rfpResponse = await page.request.post('/api/rfps', {
    headers: airlineHeaders,
    data: {
      airportCode: 'DXB',
      serviceType: 'BAGGAGE',
      requirements: `Phase 7.5 supplier summary ${Date.now()}`,
      desiredStartDate: '2027-01-01',
      desiredEndDate: '2028-12-31',
    },
  });
  expect(rfpResponse.status()).toBe(201);
  const rfp = await rfpResponse.json();

  const proposalResponse = await page.request.post(`/api/supplier/rfps/${rfp.id}/proposals`, {
    headers: supplierHeaders,
    data: {
      proposedRate: 17.5,
      currency: 'USD',
      terms: 'Net 30 with fixed annual rate.',
    },
  });
  expect(proposalResponse.status()).toBe(201);
  const supplierRfp = await proposalResponse.json();

  const decisionResponse = await page.request.post(
    `/api/rfps/${rfp.id}/proposals/${supplierRfp.proposalId}/decision`,
    {
      headers: airlineHeaders,
      data: { status: 'ACCEPTED', seedContract: false },
    },
  );
  expect(decisionResponse.ok()).toBeTruthy();

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.reload();
  await page.getByRole('menuitem', { name: 'RFP Summary' }).click();

  await expect(page.getByRole('heading', { name: 'RFP Summary' })).toBeVisible();
  const row = page.locator(`#rfp-summary-row-${rfp.id}`);
  await expect(row).toContainText('AWARDED');
  await expect(row).toContainText('ACCEPTED');
  await expect(row).toContainText('WON');
  await expect(row).toContainText('USD 17.5');
  await expect(page.getByTestId('rfp-summary-won').locator('.ant-statistic-content-value'))
    .not.toHaveText('0');

  const outcomeFilter = page.getByTestId('rfp-summary-outcome-filter');
  await outcomeFilter.click();
  await page.locator('.ant-select-dropdown:visible').getByText('WON', { exact: true }).click();
  await expect(row).toBeVisible();
  await expect(page.getByRole('cell', { name: 'OPEN' })).toHaveCount(0);
});
