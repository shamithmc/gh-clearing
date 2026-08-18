import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
};

const supplierHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

test('supplier publishes an offering and airline discovers it and starts an RFP', async ({ page }) => {
  test.setTimeout(90_000);

  const configuration = await page.request.put('/api/tenants/SWISSPORT/configuration', {
    headers: platformHeaders,
    data: {
      emailIds: 'marketplace@swissport.test',
      invoiceBackdatingDays: 30,
      regionalClassification: 'MIDDLE_EAST',
      enabledAirlines: ['EK'],
      enabledAirports: ['DXB'],
    },
  });
  expect(configuration.ok()).toBeTruthy();

  const existingResponse = await page.request.get('/api/supplier/offerings', { headers: supplierHeaders });
  expect(existingResponse.ok()).toBeTruthy();
  const existing = await existingResponse.json();
  for (const offering of existing.filter((item: { airportCode: string; serviceType: string }) =>
    item.airportCode === 'DXB' && item.serviceType === 'BAGGAGE')) {
    const deletion = await page.request.delete(`/api/supplier/offerings/${offering.id}`, {
      headers: supplierHeaders,
    });
    expect(deletion.status()).toBe(204);
  }

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.reload();
  await page.getByRole('menuitem', { name: 'Service Offerings' }).click();
  await expect(page.getByRole('heading', { name: 'Service Offerings' })).toBeVisible();

  await page.getByTestId('add-service-offering').click();
  const dialog = page.getByRole('dialog');
  const airport = dialog.getByTestId('offering-airport');
  await airport.click();
  const airportInput = airport.getByRole('combobox', { name: 'Offering airport' });
  await airportInput.fill('DXB');
  await expect(page.getByRole('option', { name: /DXB - Dubai International Airport/ })).toHaveCount(1);
  await airportInput.press('Enter');
  const service = dialog.getByTestId('offering-service');
  await service.click();
  const serviceInput = service.getByRole('combobox', { name: 'Offering service' });
  await serviceInput.fill('BAGGAGE');
  await expect(page.getByRole('option', { name: 'BAGGAGE - Baggage Handling' })).toHaveCount(1);
  await serviceInput.press('Enter');
  const description = `24/7 baggage handling marketplace service ${Date.now()}`;
  await dialog.getByTestId('offering-description').fill(description);

  const publicationRequest = page.waitForResponse(response =>
    response.url().endsWith('/api/supplier/offerings')
      && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Publish Offering' }).click();
  const publicationResponse = await publicationRequest;
  expect(publicationResponse.status()).toBe(201);
  await expect(page.getByText('Service offering published to the marketplace')).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
  const publishedResponse = await page.request.get('/api/supplier/offerings', { headers: supplierHeaders });
  const publishedOfferings = await publishedResponse.json();
  const offering = publishedOfferings.find((item: { description: string }) => item.description === description);
  expect(offering?.id).toBeTruthy();

  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Marketplace' }).click();
  await expect(page.getByRole('heading', { name: 'Service Provider Marketplace' })).toBeVisible();

  const region = page.getByTestId('marketplace-region');
  await region.click();
  const marketplaceResponse = page.waitForResponse(response =>
    response.url().includes('/api/marketplace/offerings?')
      && response.url().includes('region=MIDDLE_EAST'));
  await page.locator('.ant-select-dropdown:visible')
    .getByText('MIDDLE_EAST', { exact: true })
    .click();
  await marketplaceResponse;

  await expect(page.getByText('SWISSPORT').first()).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
  await expect(page.getByText('DXB - Dubai International Airport, United Arab Emirates')).toBeVisible();

  await page.getByTestId(`initiate-rfp-${offering.id}`).click();
  await expect(page).toHaveURL(/\/airline\/rfps\?airportCode=DXB&serviceType=BAGGAGE$/);
  await expect(page.getByTestId('rfp-airport').locator('.ant-select-selection-item')).toContainText('DXB');
  await expect(page.getByTestId('rfp-service').locator('.ant-select-selection-item')).toContainText('BAGGAGE');
});
