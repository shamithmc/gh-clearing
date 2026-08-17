import { expect, test } from '@playwright/test';

const supplierHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

test('ground-handler administrator edits and reloads supplier configuration', async ({ page }) => {
  const reset = await page.request.put('/api/tenants/SWISSPORT/configuration', {
    headers: supplierHeaders,
    data: {
      emailIds: null,
      invoiceBackdatingDays: 30,
      regionalClassification: null,
      enabledAirlines: [],
      enabledAirports: [],
    },
  });
  expect(reset.ok()).toBeTruthy();

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.goto('/configuration');

  await expect(page.getByRole('heading', { name: 'Supplier Configuration' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Configuration' })).toBeVisible();

  await page.getByTestId('configuration-email-ids').fill('configuration@swissport.test');
  await page.getByTestId('configuration-region').fill('MIDDLE_EAST');
  const airlines = page.getByTestId('configuration-airlines');
  await airlines.click();
  await airlines.getByRole('combobox').fill('EK');
  await page.locator('.ant-select-dropdown:visible').getByText(/EK.*Emirates/).click();
  await expect(airlines.locator('.ant-select-selection-item')).toContainText('EK');
  const airports = page.getByTestId('configuration-airports');
  await airports.click();
  await airports.getByRole('combobox').fill('DXB');
  await page.locator('.ant-select-dropdown:visible').getByText(/DXB.*Dubai International/).click();
  await expect(airports.locator('.ant-select-selection-item')).toContainText('DXB');

  const updateResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/tenants/SWISSPORT/configuration')
      && response.request().method() === 'PUT');
  await page.getByTestId('save-configuration').click();
  expect((await updateResponse).status()).toBe(200);
  await expect(page.getByText('Supplier configuration saved successfully.')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('configuration-email-ids')).toHaveValue('configuration@swissport.test');
  await expect(page.getByTestId('configuration-region')).toHaveValue('MIDDLE_EAST');
  await expect(page.getByTestId('configuration-airlines').locator('.ant-select-selection-item')).toContainText('EK');
  await expect(page.getByTestId('configuration-airports').locator('.ant-select-selection-item')).toContainText('DXB');
});

test('airline persona cannot see or open supplier configuration', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/configuration');

  await expect(page.getByText('Configuration access denied')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Configuration' })).toHaveCount(0);
});
