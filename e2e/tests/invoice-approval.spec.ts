import { test, expect } from '@playwright/test';

test.describe('Invoice Approval Workflow E2E', () => {
  let contractId: string;

  test.beforeAll(async ({ request }) => {
    // Seed approved contract to be referenced during invoice creation
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

    // Submit contract for approval
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

    // Approve the contract
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

  test('successfully execute draft -> finalize -> modification -> re-finalize -> approve -> send lifecycle', async ({ page }) => {
    // 1. Create a draft invoice
    await page.goto('/');
    await page.click('text=Invoices');
    await page.click('text=Create Invoice');

    // Fill Step 1 details
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("Dubai International Airport (DXB)")');

    const invoiceNum = 'INV-APP-' + Math.floor(Math.random() * 1000000);
    await page.fill('#invoiceNumber', invoiceNum);

    await page.click('#currency');
    await page.fill('#currency', 'AED');
    await page.click('.ant-select-item-option-content:has-text("AED")');

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

    // Add line item
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

    await page.fill('input[placeholder="e.g. 150"]', '150');

    // Proceed to Step 3
    await page.click('button:has-text("Next")');

    // Submit / Save draft
    await page.click('button:has-text("Submit Draft Invoice")');

    // Confirm navigation back to list and check status is DRAFT
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.locator('body')).toContainText('Invoice drafted successfully!');

    const invoiceRow = page.locator('tr').filter({ hasText: invoiceNum }).first();
    await expect(invoiceRow).toContainText('DRAFT');

    // 2. Finalize the invoice (as Swissport Ground Handler)
    await invoiceRow.locator('button:has-text("Finalize")').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to FINALIZED');
    await expect(invoiceRow).toContainText('FINALIZED');
    await expect(invoiceRow.locator('button:has-text("Finalize")')).not.toBeVisible();

    // 3. Switch Simulated Tenant User to Emirates (Airline)
    await page.locator('.ant-select').filter({ hasText: 'Swissport' }).first().click();
    await page.click('.ant-select-item-option-content:has-text("Emirates (Airline)")');

    // Verify actions
    await expect(invoiceRow.locator('button:has-text("Approve")')).toBeVisible();
    await expect(invoiceRow.locator('button:has-text("Request Modification")')).toBeVisible();

    // Request Modification with comments
    await invoiceRow.locator('button:has-text("Request Modification")').click();
    const comment = 'Please correct passenger count to 150';
    await page.fill('textarea[placeholder="Type comments/reasons here..."]', comment);
    await page.click('.ant-modal-footer button:has-text("Submit Request")');

    // Verify status transitions to MODIFICATION_REQUESTED
    await expect(page.locator('body')).toContainText('Invoice status updated to MODIFICATION_REQUESTED');
    await expect(invoiceRow).toContainText('MODIFICATION_REQUESTED');

    // Expand the row to see comments
    await invoiceRow.locator('button.ant-table-row-expand-icon').click();
    await expect(invoiceRow.locator('xpath=following-sibling::tr')).toContainText(comment);

    // 4. Switch back to Swissport to re-finalize
    await page.locator('.ant-select').filter({ hasText: 'Emirates' }).first().click();
    await page.click('.ant-select-item-option-content:has-text("Swissport (Ground Handler)")');

    // Re-finalize
    await invoiceRow.locator('button:has-text("Finalize")').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to FINALIZED');
    await expect(invoiceRow).toContainText('FINALIZED');

    // 5. Switch to Emirates to Approve
    await page.locator('.ant-select').filter({ hasText: 'Swissport' }).first().click();
    await page.click('.ant-select-item-option-content:has-text("Emirates (Airline)")');

    // Approve the invoice
    await invoiceRow.locator('button:has-text("Approve")').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to APPROVED');
    await expect(invoiceRow).toContainText('APPROVED');

    // 6. Switch back to Swissport to Send
    await page.locator('.ant-select').filter({ hasText: 'Emirates' }).first().click();
    await page.click('.ant-select-item-option-content:has-text("Swissport (Ground Handler)")');

    // Send the invoice
    await invoiceRow.locator('button:has-text("Send to Airline")').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to SENT');
    await expect(invoiceRow).toContainText('SENT');
  });
});
