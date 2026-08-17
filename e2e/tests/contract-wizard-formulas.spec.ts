import { test, expect, Page } from '@playwright/test';

async function selectAntdOption(page: Page, inputId: string, optionText: string, searchTerm?: string) {
  const container = page.locator(`.ant-select:has(#${inputId})`);
  await container.scrollIntoViewIfNeeded();
  await container.click({ force: true });
  if (searchTerm) {
    const input = page.locator(`#${inputId}`);
    await input.fill(searchTerm);
  }
  const option = page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content:has-text("${optionText}")`).first();
  await option.waitFor({ state: 'visible' });
  await option.click({ force: true });
}

test.describe('Contract Wizard Dynamic Formula Authoring (PF-01 through PF-07)', () => {
  test.beforeEach(async ({ page, request }) => {
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

    await request.put('/api/tenants/SWISSPORT/configuration', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'PLATFORM',
        'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
        'X-Mock-User-Id': 'dev-PLATFORM',
      },
      data: {
        emailIds: 'swissport@test.com',
        invoiceBackdatingDays: 30,
        regionalClassification: 'MIDDLE_EAST',
        enabledAirlines: ['EK', 'LH'],
        enabledAirports: ['DXB', 'FRA'],
      },
    });
  });

  test('successfully configures multi-formula service lines (PF-01, PF-03, PF-05, PF-06) and submits contract', async ({
    page,
  }) => {
    // 1. Navigate to Create Contract
    await page.goto('/');
    await page.click('text=Contracts');
    await page.click('button:has-text("Create Contract")');
    await expect(page).toHaveURL(/\/contracts\/new/);

    // 2. Step 1: Fill Header Details
    await selectAntdOption(page, 'airlineId', 'Emirates', 'Emirates');
    await selectAntdOption(page, 'airportCode', 'FRA', 'FRA');

    await page.click('input[placeholder="Start date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-01-01');
    await page.keyboard.press('Enter');

    await page.click('input[placeholder="End date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-12-31');
    await page.keyboard.press('Enter');

    await selectAntdOption(page, 'currency', 'USD', 'USD');

    await page.click('#contract-wizard-next-btn');

    // 3. Step 2: Configure Service Lines
    // Service Line 1: PF-01 (Unit Rate)
    await page.click('#add-service-line-btn');
    await selectAntdOption(page, 'services_0_chargeCode', 'PASSENGER_HANDLING', 'PASSENGER');
    await page.fill('#services_0_serviceName', 'Turnaround Passenger Handling');
    await selectAntdOption(page, 'services_0_formulaType', 'PF-01', 'PF-01');
    await page.fill('#services_0_quantityDriver', 'passengers');
    await page.fill('#services_0_uom', 'PAX');
    await page.fill('#services_0_rate', '12.50');

    // Service Line 2: PF-03 (Incremental Tiered Volume)
    await page.click('#add-service-line-btn');
    await selectAntdOption(page, 'services_1_chargeCode', 'BAGGAGE', 'BAGGAGE');
    await page.fill('#services_1_serviceName', 'Tiered Baggage Sorting');
    await selectAntdOption(page, 'services_1_formulaType', 'PF-03', 'PF-03');
    await expect(page.locator('text=Incremental Volume Tiers')).toBeVisible();

    // Service Line 3: PF-05 (Time Band Rate)
    await page.click('#add-service-line-btn');
    await selectAntdOption(page, 'services_2_chargeCode', 'RAMP_HANDLING', 'RAMP');
    await page.fill('#services_2_serviceName', 'Ramp Night / Day Operations');
    await selectAntdOption(page, 'services_2_formulaType', 'PF-05', 'PF-05');
    await expect(page.locator('text=Time-of-Day Bands (PF-05)')).toBeVisible();

    // Service Line 4: PF-06 (Day-of-Week Rate)
    await page.click('#add-service-line-btn');
    await selectAntdOption(page, 'services_3_chargeCode', 'DEICING', 'DEICING');
    await page.fill('#services_3_serviceName', 'Winter Deicing Schedule');
    await selectAntdOption(page, 'services_3_formulaType', 'PF-06', 'PF-06');
    await expect(page.locator('text=Day-of-Week Rates (PF-06)')).toBeVisible();

    // 4. Move to Step 3: Review & Summary
    await page.click('#contract-wizard-next-btn');

    // Verify Review Step displays header summary and breakdown cards
    await expect(page.locator('text=Contract Agreement Review')).toBeVisible();
    await expect(page.locator('text=Configured Service Lines (4)')).toBeVisible();
    await expect(page.locator('text=Turnaround Passenger Handling')).toBeVisible();
    await expect(page.locator('text=Tiered Baggage Sorting')).toBeVisible();
    await expect(page.locator('text=Ramp Night / Day Operations')).toBeVisible();
    await expect(page.locator('text=Winter Deicing Schedule')).toBeVisible();

    // 5. Submit Draft Contract
    await page.click('#contract-wizard-submit-btn');

    // Verify redirect and success toast
    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract drafted successfully!');
  });
});
