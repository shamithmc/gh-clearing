import { test, expect } from '@playwright/test';

test.describe('Supplier MIS Dashboard E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('successfully renders dashboard metrics and SVG charts', async ({ page }) => {
    // Verify Page Title
    await expect(page.locator('h3')).toContainText('Dashboard Analytics');

    // Verify top-level stats cards are visible
    await expect(page.locator('text=Outstanding Receivables')).toBeVisible();
    await expect(page.locator('text=Invoiced This Month')).toBeVisible();
    await expect(page.locator('text=Active Disputes')).toBeVisible();
    await expect(page.locator('text=Collections Success')).toBeVisible();

    // Verify Receivables Donut SVG is rendered
    const donutSvg = page.locator('svg').first();
    await expect(donutSvg).toBeVisible();

    // Verify the charts exist
    await expect(page.locator('text=Receivables Share by Airline')).toBeVisible();
    await expect(page.locator('text=Receivables Aging Profile')).toBeVisible();
    await expect(page.locator('text=Monthly Invoiced Trends')).toBeVisible();
    await expect(page.locator('text=Average Revenue per Flight')).toBeVisible();

    // Verify aging buckets are displayed
    await expect(page.locator('text=0 - 30 Days')).toBeVisible();
    await expect(page.locator('text=31 - 60 Days')).toBeVisible();
    await expect(page.locator('text=61 - 90 Days')).toBeVisible();
    await expect(page.locator('text=90+ Days (Overdue)')).toBeVisible();

    // Verify expiring contracts card/table exists
    await expect(page.locator('text=Contracts Up for Expiry')).toBeVisible();
  });

  test('switches to the restricted ABAC persona through the UI', async ({ page }) => {
    const scopedResponse = page.waitForResponse(response =>
      response.url().includes('/api/dashboard/receivables')
      && response.request().headers()['x-mock-user-id'] === 'dev-SWISSPORT-scoped'
    );

    const accessScope = page.locator('span', { hasText: 'Access Scope:' })
      .locator('..')
      .locator('.ant-select');
    await accessScope.click();
    await page.getByText('DXB / EK / BAGGAGE only', { exact: true }).last().click();

    const response = await scopedResponse;
    expect(response.ok()).toBeTruthy();
    await expect(accessScope).toContainText('DXB / EK / BAGGAGE only');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('simUserId')))
      .toBe('dev-SWISSPORT-scoped');
  });
});
