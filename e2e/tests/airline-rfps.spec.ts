import { expect, test } from '@playwright/test';

test('airline publishes an RFP through the UI and sees it in the tenant list', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'RFPs' }).click();

  await expect(page).toHaveURL(/\/airline\/rfps$/);
  await expect(page.getByRole('heading', { name: 'Requests for Proposal' })).toBeVisible();

  const airport = page.getByTestId('rfp-airport');
  await airport.click();
  await airport.getByRole('combobox', { name: 'RFP airport' }).fill('DXB');
  await airport.getByRole('combobox', { name: 'RFP airport' }).press('Enter');

  const service = page.getByTestId('rfp-service');
  await service.click();
  await service.getByRole('combobox', { name: 'RFP service type' }).fill('BAGGAGE');
  await service.getByRole('combobox', { name: 'RFP service type' }).press('Enter');

  await page.getByPlaceholder('Start date').fill('2027-01-01');
  await page.getByPlaceholder('End date').fill('2028-12-31');
  await page.getByPlaceholder('End date').press('Enter');

  const requirements = `Phase 7.1 baggage coverage ${Date.now()}`;
  await page.getByTestId('rfp-requirements').fill(requirements);

  const publication = page.waitForResponse(response =>
    response.url().endsWith('/api/rfps')
      && response.request().method() === 'POST');
  await page.getByTestId('publish-rfp').click();
  expect((await publication).status()).toBe(201);

  await expect(page.getByText(/RFP published to \d+ eligible ground handler/)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'DXB' }).last()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'BAGGAGE' }).last()).toBeVisible();
  await expect(page.getByRole('cell', { name: '2027-01-01 to 2028-12-31' }).last()).toBeVisible();
});
