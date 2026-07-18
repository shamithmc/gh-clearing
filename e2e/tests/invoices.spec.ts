import { test, expect } from '@playwright/test';

test.describe('Invoice Entry Wizard and Listing E2E', () => {
  let contractId = '';

  test.beforeAll(async ({ request }) => {
    // 1. Create a contract via API (returns status DRAFT)
    const createContractRes = await request.post('/api/contracts', {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'Content-Type': 'application/json',
      },
      data: {
        airlineId: 'EK',
        airportCode: 'DXB',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'AED',
        services: [
          {
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDriver: 'passengers',
            uom: 'PAX',
            taxCode: 'VAT15',
            rateDetails: { rate: 10 },
          },
        ],
      },
    });
    expect(createContractRes.status()).toBe(201);
    const contract = await createContractRes.json();
    contractId = contract.id;

    // 2. Submit the contract to PENDING_APPROVAL via API (as GROUND_HANDLER)
    const submitContractRes = await request.put(`/api/contracts/${contractId}/status`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'Content-Type': 'application/json',
      },
      data: {
        status: 'PENDING_APPROVAL',
      },
    });
    expect(submitContractRes.status()).toBe(200);

    // 3. Approve the contract via API (as AIRLINE counter-party)
    const approveContractRes = await request.put(`/api/contracts/${contractId}/status`, {
      headers: {
        'X-Mock-Tenant-Id': 'EK',
        'X-Mock-Tenant-Type': 'AIRLINE',
        'Content-Type': 'application/json',
      },
      data: {
        status: 'APPROVED',
      },
    });
    expect(approveContractRes.status()).toBe(200);
  });

  test('successfully draft invoice with auto-calculations', async ({ page }) => {
    // Go to invoice creation wizard
    // Start at homepage and navigate via UI to avoid backend direct routing 401/404s
    await page.goto('/');
    await page.click('text=Invoices');
    await page.click('text=Create Invoice');

    // Fill Step 1: Context details
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("Dubai International Airport (DXB)")');

    const invoiceNum = 'INV-E2E-' + Math.floor(Math.random() * 1000000);
    await page.fill('input[placeholder="INV-2026-0001"]', invoiceNum);

    await page.click('#currency');
    await page.fill('#currency', 'AED');
    await page.click('.ant-select-item-option-content:has-text("AED")');

    await page.fill('#exchangeRate', '1.0');

    // Select Dates
    await page.click('#issueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-01');
    await page.keyboard.press('Enter');

    await page.click('#dueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-31');
    await page.keyboard.press('Enter');

    // Proceed to Step 2
    await page.click('button:has-text("Next")');

    // Click "Add Flight Item"
    await page.click('button:has-text("Add Flight Item")');

    // Fill line item details
    await page.click('#lineItems_0_flightDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-02');
    await page.keyboard.press('Enter');

    await page.fill('input[placeholder="EK302"]', 'EK302');
    await page.fill('input[placeholder="A6-EEO"]', 'A6-EEO');
    await page.fill('input[placeholder="DXB"]', 'DXB');
    await page.fill('input[placeholder="FRA"]', 'FRA');

    // Select contracted service
    await page.click('#lineItems_0_chargeCode');
    await page.click('text=Passenger Handling (PASSENGER_HANDLING)');

    // Enter Driver Qty
    await page.fill('input[placeholder="e.g. 150"]', '150');

    // Wait a brief moment and verify formula PF-01 is displayed
    await expect(page.locator('text=Pricing Formula: PF-01')).toBeVisible();

    // Proceed to Step 3: Preview
    await page.click('button:has-text("Next")');

    // Verify calculated amount in preview table (150 * 10 = 1500)
    await expect(page.locator('table tbody tr').first()).toContainText('1500.00');
    await expect(page.locator('h3:has-text("Total Amount:")')).toContainText('1500.00');

    // Submit the draft invoice
    await page.click('button:has-text("Submit Draft Invoice")');

    // Should redirect to Invoices list
    await page.waitForURL('/invoices');

    // Reload the page to fetch the latest data from the backend
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify draft invoice appears in the list
    await expect(page.locator('table').first()).toContainText(invoiceNum);
    await expect(page.locator('table').first()).toContainText('DRAFT');
  });

  test('fails submission on cross-currency validation without positive exchange rate', async ({ page }) => {
    // Start at homepage and navigate via UI to avoid backend direct routing 401/404s
    await page.goto('/');
    await page.click('text=Invoices');
    await page.click('text=Create Invoice');

    // Fill Step 1 details with mismatched currency
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("Dubai International Airport (DXB)")');

    const invoiceNum2 = 'INV-E2E-' + Math.floor(Math.random() * 1000000);
    await page.fill('input[placeholder="INV-2026-0001"]', invoiceNum2);

    await page.click('#currency');
    await page.fill('#currency', 'USD');
    await page.click('.ant-select-item-option-content:has-text("USD")'); // Contract currency is AED, so this triggers cross-currency checks

    // Put negative exchange rate
    await page.fill('#exchangeRate', '-0.5');

    await page.click('#issueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-01');
    await page.keyboard.press('Enter');

    await page.click('#dueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-31');
    await page.keyboard.press('Enter');

    // Go to Next steps and add item
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Add Flight Item")');

    await page.click('#lineItems_0_flightDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-02');
    await page.keyboard.press('Enter');

    await page.fill('input[placeholder="EK302"]', 'EK302');
    await page.fill('input[placeholder="A6-EEO"]', 'A6-EEO');
    await page.fill('input[placeholder="DXB"]', 'DXB');
    await page.fill('input[placeholder="FRA"]', 'FRA');

    await page.click('#lineItems_0_chargeCode');
    await page.click('text=Passenger Handling (PASSENGER_HANDLING)');

    await page.fill('input[placeholder="e.g. 150"]', '100');

    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Submit Draft Invoice")');

    // Assert that alert message appears or that we did not redirect
    await expect(page.locator('.ant-message-notice')).toContainText('Failed to create invoice.');
  });
});
