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

test('eligible ground handler views an airline RFP and submits a proposal through the UI', async ({ page }) => {
  const configuration = await page.request.put('/api/tenants/SWISSPORT/configuration', {
    headers: platformHeaders,
    data: {
      emailIds: 'rfp@swissport.test',
      invoiceBackdatingDays: 30,
      regionalClassification: 'MIDDLE_EAST',
      enabledAirlines: ['EK', 'LH'],
      enabledAirports: ['DXB', 'FRA'],
    },
  });
  expect(configuration.ok()).toBeTruthy();

  const requirements = `Phase 7.2 supplier response ${Date.now()}`;
  const rfpResponse = await page.request.post('/api/rfps', {
    headers: airlineHeaders,
    data: {
      airportCode: 'DXB',
      serviceType: 'BAGGAGE',
      requirements,
      desiredStartDate: '2027-01-01',
      desiredEndDate: '2028-12-31',
    },
  });
  expect(rfpResponse.status()).toBe(201);
  const rfp = await rfpResponse.json();
  expect(rfp.eligibleGroundHandlerIds).toContain('SWISSPORT');

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'RFP Summary' }).click();

  await expect(page).toHaveURL(/\/rfps$/);
  await expect(page.getByRole('heading', { name: 'RFP Summary' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'EK' }).last()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'DXB' }).last()).toBeVisible();

  await page.getByTestId(`respond-rfp-${rfp.id}`).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Rate for the requested service').fill('18.75');
  await dialog.getByPlaceholder(/Describe rate basis/).fill('Net 30. Rate fixed for twelve months.');

  const submission = page.waitForResponse(response =>
    response.url().endsWith(`/api/supplier/rfps/${rfp.id}/proposals`)
      && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Submit Proposal' }).click();
  expect((await submission).status()).toBe(201);

  await expect(page.getByText('Proposal submitted to the airline')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'SUBMITTED' }).last()).toBeVisible();
  await expect(page.getByText('USD 18.75').last()).toBeVisible();
});
