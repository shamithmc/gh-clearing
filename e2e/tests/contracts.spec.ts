import { test, expect } from '@playwright/test';

test.describe('Contract Entry Wizard and Lifecycle E2E', () => {
  test('successfully draft, submit, and approve a contract', async ({ page }) => {
    // 1. Go to root page and navigate via sidebar menu to avoid Tomcat subpath routing 401s
    await page.goto('/');
    await page.click('text=Contracts');

    // 2. Click "Create Contract" button
    await page.click('button:has-text("Create Contract")');
    await expect(page).toHaveURL(/\/contracts\/new/);

    // 3. Step 1: Fill Header Details
    // Select Airline
    await page.click('#airlineId');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    // Select Airport (Using FRA to avoid collision with DXB invoices test)
    await page.click('#airportCode');
    await page.click('.ant-select-item-option-content:has-text("FRA - Frankfurt")');

    // Enter Validity Period
    await page.click('input[placeholder="Start date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-01-01');
    await page.keyboard.press('Enter');

    await page.click('input[placeholder="End date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-12-31');
    await page.keyboard.press('Enter');

    // Select Currency
    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("USD")');

    // Click "Next"
    await page.click('button:has-text("Next")');

    // 4. Step 2: Service Lines
    await page.click('button:has-text("Add Service Line")');

    // Select Charge Code
    await page.click('#services_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("PASSENGER_HANDLING")');

    // Service Name
    await page.fill('#services_0_serviceName', 'E2E Passenger Handling Service');

    // Formula Type
    await page.click('#services_0_formulaType');
    await page.click('.ant-select-item-option-content:has-text("PF-01 (Unit Rate)")');

    // Quantity Driver
    await page.fill('#services_0_quantityDriver', 'passengers');

    // UoM
    await page.fill('#services_0_uom', 'PAX');

    // Tax Code
    await page.fill('#services_0_taxCode', 'VAT-0');

    // Base Rate
    await page.fill('#services_0_rate', '12.50');

    // Click "Next"
    await page.click('button:has-text("Next")');

    // 5. Step 3: Review & Submit
    await page.click('button:has-text("Submit Contract")');

    // Expect navigation back to list page and success toast/message
    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract drafted successfully!');

    // Wait for the table to refresh
    const firstTable = page.locator('table').first();
    await expect(firstTable).toContainText('EK');
    await expect(firstTable).toContainText('FRA');
    await expect(firstTable).toContainText('DRAFT');

    // Locate the newly created contract row's "Submit for Approval" button and click it
    const contractRow = page.locator('tr').filter({ hasText: 'EK' }).filter({ hasText: 'FRA' }).first();
    await contractRow.locator('button:has-text("Submit for Approval")').click();

    // Verify status transitions to PENDING_APPROVAL and button disappears
    await expect(page.locator('body')).toContainText('Contract status updated to PENDING_APPROVAL');
    await expect(contractRow).toContainText('PENDING_APPROVAL');
    await expect(contractRow.locator('button:has-text("Submit for Approval")')).not.toBeVisible();

    // Verify internal contract approver actions are available to Swissport
    await expect(contractRow.locator('button:has-text("Approve")')).toBeVisible();
    await expect(contractRow.locator('button:has-text("Request Review")')).toBeVisible();

    // Click Approve
    await contractRow.locator('button:has-text("Approve")').click();

    // Verify status changes to APPROVED and action buttons disappear
    await expect(page.locator('body')).toContainText('Contract status updated to APPROVED');
    await expect(contractRow).toContainText('APPROVED');
    
    // Explicitly assert that the action buttons are not visible (ignoring the row expansion button)
    await expect(contractRow.locator('button:has-text("Approve")')).not.toBeVisible();
    await expect(contractRow.locator('button:has-text("Request Review")')).not.toBeVisible();
  });

  test('successfully draft contract with Slab-Based Incremental Pricing (PF-03)', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Contracts');
    await page.click('button:has-text("Create Contract")');
    await expect(page).toHaveURL(/\/contracts\/new/);

    // Step 1: Header Details
    await page.click('#airlineId');
    await page.click('.ant-select-item-option-content:has-text("Lufthansa (LH)")');

    await page.click('#airportCode');
    await page.click('.ant-select-item-option-content:has-text("FRA - Frankfurt")');

    await page.click('input[placeholder="Start date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-01-01');
    await page.keyboard.press('Enter');

    await page.click('input[placeholder="End date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-12-31');
    await page.keyboard.press('Enter');

    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("EUR")');

    await page.click('button:has-text("Next")');

    // Step 2: Service Lines — PF-03 (Tiered Volume)
    await page.click('button:has-text("Add Service Line")');

    await page.click('#services_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("BAGGAGE")');

    await page.fill('#services_0_serviceName', 'E2E Baggage Handling - Tiered');

    await page.click('#services_0_formulaType');
    await page.click('.ant-select-item-option-content:has-text("PF-03 (Tiered Volume)")');

    await page.fill('#services_0_quantityDriver', 'bags');
    await page.fill('#services_0_uom', 'BAG');
    await page.fill('#services_0_taxCode', 'VAT-19');
    await page.fill('#services_0_rate', '8.00');

    await page.click('button:has-text("Next")');

    // Step 3: Review & Submit
    await page.click('button:has-text("Submit Contract")');

    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract drafted successfully!');

    const firstTable = page.locator('table').first();
    await expect(firstTable).toContainText('LH');
    await expect(firstTable).toContainText('FRA');
    await expect(firstTable).toContainText('DRAFT');
  });

  test('successfully draft contract with Time-Based Pricing (PF-05)', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Contracts');
    await page.click('button:has-text("Create Contract")');
    await expect(page).toHaveURL(/\/contracts\/new/);

    // Step 1: Header Details
    await page.click('#airlineId');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.click('.ant-select-item-option-content:has-text("DXB - Dubai")');

    await page.click('input[placeholder="Start date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-06-01');
    await page.keyboard.press('Enter');

    await page.click('input[placeholder="End date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2027-05-31');
    await page.keyboard.press('Enter');

    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("AED")');

    await page.click('button:has-text("Next")');

    // Step 2: Service Lines — PF-05 (Time Band Rate)
    await page.click('button:has-text("Add Service Line")');

    await page.click('#services_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("DEICING")');

    await page.fill('#services_0_serviceName', 'E2E De-icing - Time Based');

    await page.click('#services_0_formulaType');
    await page.click('.ant-select-item-option-content:has-text("PF-05 (Time Band Rate)")');

    await page.fill('#services_0_quantityDriver', 'hours');
    await page.fill('#services_0_uom', 'HR');
    await page.fill('#services_0_taxCode', 'VAT-5');
    await page.fill('#services_0_rate', '250.00');

    await page.click('button:has-text("Next")');

    // Step 3: Review & Submit
    await page.click('button:has-text("Submit Contract")');

    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract drafted successfully!');

    const firstTable = page.locator('table').first();
    await expect(firstTable).toContainText('EK');
    await expect(firstTable).toContainText('DXB');
    await expect(firstTable).toContainText('DRAFT');
  });

  test('successfully draft contract with MTOW Weight-Based Pricing (PF-07)', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Contracts');
    await page.click('button:has-text("Create Contract")');
    await expect(page).toHaveURL(/\/contracts\/new/);

    // Step 1: Header Details
    await page.click('#airlineId');
    await page.click('.ant-select-item-option-content:has-text("Lufthansa (LH)")');

    await page.click('#airportCode');
    await page.click('.ant-select-item-option-content:has-text("DXB - Dubai")');

    await page.click('input[placeholder="Start date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-03-01');
    await page.keyboard.press('Enter');

    await page.click('input[placeholder="End date"]');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2027-02-28');
    await page.keyboard.press('Enter');

    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("USD")');

    await page.click('button:has-text("Next")');

    // Step 2: Service Lines — PF-07 (Custom Formula / MTOW Weight-Based)
    await page.click('button:has-text("Add Service Line")');

    await page.click('#services_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("PASSENGER_HANDLING")');

    await page.fill('#services_0_serviceName', 'E2E MTOW Weight-Based Handling');

    await page.click('#services_0_formulaType');
    await page.click('.ant-select-item-option-content:has-text("PF-07 (Custom Formula)")');

    await page.fill('#services_0_quantityDriver', 'mtow_tonnes');
    await page.fill('#services_0_uom', 'TON');
    await page.fill('#services_0_taxCode', 'VAT-0');
    await page.fill('#services_0_rate', '0.85');

    await page.click('button:has-text("Next")');

    // Step 3: Review & Submit
    await page.click('button:has-text("Submit Contract")');

    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract drafted successfully!');

    const firstTable = page.locator('table').first();
    await expect(firstTable).toContainText('LH');
    await expect(firstTable).toContainText('DXB');
    await expect(firstTable).toContainText('DRAFT');
  });
});
