import { test, expect } from '@playwright/test';

test.describe('Phase 9 — Dispute Management Workspace E2E', () => {
  test('renders disputes workspace and filters by status tabs', async ({ page }) => {
    await page.goto('/disputes');

    // Header title verification
    await expect(page.getByRole('heading', { name: 'Dispute Management Workspace' })).toBeVisible();

    // Verify Metric Cards
    await expect(page.getByText('Total Disputed Exposure')).toBeVisible();
    await expect(page.getByText('Credit Notes Auto-Issued')).toBeVisible();
    await expect(page.getByText('Active Disputes Queue')).toBeVisible();
    await expect(page.getByText('Resolved Disputes')).toBeVisible();

    // Verify Tab switching
    await page.getByRole('tab', { name: /Open/i }).click();
    await page.getByRole('tab', { name: /All Disputes/i }).click();
  });
});
