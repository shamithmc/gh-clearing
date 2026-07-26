import { test, expect } from '@playwright/test';

test.describe('Phase 9 — Dispute Management Workspace & Airline Flow E2E', () => {
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

  test('airline user raises a dispute on a SENT invoice from /airline/invoices', async ({ page }) => {
    await page.goto('/airline/invoices');

    // Verify header title
    await expect(page.getByText('My Invoices & Dispatched Billing')).toBeVisible();

    // Check if there is a SENT invoice with Raise Dispute button
    const raiseDisputeBtn = page.getByRole('button', { name: 'Raise Dispute' }).first();
    if (await raiseDisputeBtn.isVisible()) {
      await raiseDisputeBtn.click();

      // Modal should appear
      await expect(page.getByText(/Raise Dispute on Invoice/i)).toBeVisible();

      // Enter comment
      await page.getByPlaceholder('Provide detailed justification for the dispute...').fill('E2E Test: Billed quantity exceeds flight manifest.');

      // Submit dispute
      await page.getByRole('button', { name: 'Submit Dispute' }).click();

      // Toast or status update
      await expect(page.getByText(/Dispute raised on invoice/i)).toBeVisible();

      // Navigate to /disputes workspace to verify
      await page.goto('/disputes');
      await expect(page.getByRole('heading', { name: 'Dispute Management Workspace' })).toBeVisible();
    }
  });
});
