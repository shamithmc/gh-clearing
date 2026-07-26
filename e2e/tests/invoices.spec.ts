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
      data: { status: 'PENDING_APPROVAL' },
    });
    expect(submitContractRes.status()).toBe(200);

    // 3. Approve the contract via API
    const approveContractRes = await request.put(`/api/contracts/${contractId}/status`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'Content-Type': 'application/json',
      },
      data: { status: 'APPROVED' },
    });
    expect(approveContractRes.status()).toBe(200);
  });

  test('successfully draft invoice with auto-calculations', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Invoices');

    // Navigate to wizard via the Create Invoice button (id-based)
    await page.click('#create-invoice-btn');

    // --- Step 1: Header & Scope ---
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("DXB")');

    const invoiceNum = 'INV-E2E-' + Math.floor(Math.random() * 1000000);
    await page.fill('input[placeholder="INV-2026-0001"]', invoiceNum);

    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("AED")');

    await page.fill('#exchangeRate', '1.0');
    await page.fill('#exchangeRateSource', 'E2E reference rate');

    await page.click('#issueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-01');
    await page.keyboard.press('Enter');

    await page.click('#dueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-31');
    await page.keyboard.press('Enter');

    // Proceed to Step 2 (id-based Next button)
    await page.click('#invoice-wizard-next-btn');

    // --- Step 2: Line Items ---
    await page.click('#invoice-wizard-add-flight-btn');

    await page.click('#lineItems_0_flightDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-02');
    await page.keyboard.press('Enter');

    await page.fill('input[placeholder="EK302"]', 'EK302');
    await page.fill('input[placeholder="A6-EEO"]', 'A6-EEO');
    await page.fill('input[placeholder="DXB"]', 'DXB');
    await page.fill('input[placeholder="FRA"]', 'FRA');

    await page.click('#lineItems_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("Passenger Handling")');

    await page.fill('input[placeholder="e.g. 150"]', '150');

    await expect(page.locator('text=Pricing Formula: PF-01')).toBeVisible();

    // Proceed to Step 3 (id-based Next button)
    await page.click('#invoice-wizard-next-btn');

    // --- Step 3: Preview ---
    await expect(page.locator('table tbody tr').first()).toContainText('1500.00');
    await expect(page.locator('h3:has-text("Total Amount:")')).toContainText('1500.00');

    // Submit (id-based submit button)
    await page.click('#invoice-wizard-submit-btn');

    await expect(page.locator('.ant-message-notice')).toContainText('Invoice drafted successfully!');
    await expect(page).toHaveURL(/\/invoices/);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table').first()).toContainText(invoiceNum);
    await expect(page.locator('table').first()).toContainText('Draft');
  });

  test('fails submission on cross-currency validation without positive exchange rate', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Invoices');
    await page.click('#create-invoice-btn');

    // --- Step 1 ---
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("DXB")');

    const invoiceNum2 = 'INV-E2E-' + Math.floor(Math.random() * 1000000);
    await page.fill('input[placeholder="INV-2026-0001"]', invoiceNum2);

    await page.click('#currency');
    await page.click('.ant-select-item-option-content:has-text("USD")');

    await page.fill('#exchangeRate', '-0.5');
    await page.fill('#exchangeRateSource', 'E2E invalid rate');

    await page.click('#issueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-01');
    await page.keyboard.press('Enter');

    await page.click('#dueDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-31');
    await page.keyboard.press('Enter');

    await page.click('#invoice-wizard-next-btn');
    await page.click('#invoice-wizard-add-flight-btn');

    await page.click('#lineItems_0_flightDate');
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('2026-07-02');
    await page.keyboard.press('Enter');

    await page.fill('input[placeholder="EK302"]', 'EK302');
    await page.fill('input[placeholder="A6-EEO"]', 'A6-EEO');
    await page.fill('input[placeholder="DXB"]', 'DXB');
    await page.fill('input[placeholder="FRA"]', 'FRA');

    await page.click('#lineItems_0_chargeCode');
    await page.click('.ant-select-item-option-content:has-text("Passenger Handling")');

    await page.fill('input[placeholder="e.g. 150"]', '100');

    await page.click('#invoice-wizard-next-btn');
    await page.click('#invoice-wizard-submit-btn');

    await expect(page.locator('.ant-message-notice')).toContainText(
      'Exchange rate must be provided and positive when invoice and contract currencies differ',
    );
  });

  test('SENT invoices render in read-only state without edit or approval action buttons', async ({ page, request }) => {
    // Seed a SENT invoice via API
    const invoiceNum = 'INV-IMMUT-' + Date.now();
    const createInvoiceRes = await request.post('/api/invoices', {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'Content-Type': 'application/json',
      },
      data: {
        supplierId: 'SWISSPORT',
        invoiceNumber: invoiceNum,
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'AED',
        exchangeRate: 1.0,
        exchangeRateSource: 'E2E immutability test',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        lineItems: [
          {
            contractId: contractId,
            flightDate: '2026-07-10',
            flightNumber: 'EK901',
            aircraftReg: 'A6-EEQ',
            origin: 'DXB',
            destination: 'FRA',
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDrivers: JSON.stringify({ passengers: 100 }),
            calculatedAmount: 1000,
          },
        ],
      },
    });
    expect(createInvoiceRes.status()).toBe(201);
    const invoice = await createInvoiceRes.json();
    const sentInvoiceId = invoice.id;

    const ghHeaders = {
      'X-Mock-Tenant-Id': 'SWISSPORT',
      'X-Mock-Tenant-Type': 'GROUND_HANDLER',
      'Content-Type': 'application/json',
    };

    // Transition: DRAFT → FINALIZED → APPROVED → SENT
    await request.put(`/api/invoices/${sentInvoiceId}/status?status=FINALIZED`, { headers: ghHeaders });
    await request.put(`/api/invoices/${sentInvoiceId}/status?status=APPROVED`, { headers: ghHeaders });
    const sendRes = await request.put(`/api/invoices/${sentInvoiceId}/status?status=SENT`, { headers: ghHeaders });
    expect(sendRes.status()).toBe(200);

    // Navigate to invoices list
    await page.goto('/');
    await page.click('text=Invoices');
    await page.waitForLoadState('networkidle');

    // Locate the SENT invoice row
    const invoiceRow = page.locator('tr').filter({ hasText: invoiceNum }).first();
    await expect(invoiceRow).toBeVisible();

    // Verify SENT status badge
    await expect(invoiceRow).toContainText('Submitted to Airline');

    // Assert that Finalize, Approve, and Req Mod buttons are NOT visible for SENT invoices
    await expect(invoiceRow.locator(`button[id$="-finalize-btn"]`)).not.toBeVisible();
    await expect(invoiceRow.locator(`button[id$="-approve-btn"]`)).not.toBeVisible();
    await expect(invoiceRow.locator(`button[id$="-req-mod-btn"]`)).not.toBeVisible();
    await expect(invoiceRow.locator(`button[id$="-send-btn"]`)).not.toBeVisible();

    // Verify that download XML/PDF buttons ARE available (read-only access is allowed)
    await expect(invoiceRow.getByText('XML')).toBeVisible();
    await expect(invoiceRow.getByText('PDF')).toBeVisible();
  });
});
