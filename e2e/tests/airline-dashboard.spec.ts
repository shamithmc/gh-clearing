import { expect, test } from '@playwright/test';

test('airline dashboard initializes the airline workspace and navigation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Airline Workspace' })).toBeVisible();
  await expect(page.getByText('Your airline and dimensional access are applied automatically')).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Contracts/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Invoices/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Disputes/ })).toBeVisible();

  await expect.poll(() => page.evaluate(() => ({
    tenantId: localStorage.getItem('simTenantId'),
    tenantType: localStorage.getItem('simTenantType'),
  }))).toEqual({ tenantId: 'EK', tenantType: 'AIRLINE' });

  await page.getByRole('button', { name: /Open Contracts/ }).click();
  await expect(page).toHaveURL(/\/contracts$/);
});
