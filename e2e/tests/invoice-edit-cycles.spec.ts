import { test, expect } from '@playwright/test';

test.describe('Invoice Edit Cycles and Revision Workflow E2E', () => {
  let contractId = '';

  test.beforeAll(async ({ request }) => {
    // 1. Create a contract via API (DRAFT)
    const createContractRes = await request.post('/api/contracts', {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
        'Content-Type': 'application/json',
      },
      data: {
        airlineId: 'EK',
        airportCode: 'DXB',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'USD',
        services: [
          {
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDriver: 'passengers',
            uom: 'PAX',
            taxCode: 'VAT-0',
            rateDetails: { rate: 10 },
          },
        ],
      },
    });
    expect(createContractRes.status()).toBe(201);
    const contract = await createContractRes.json();
    contractId = contract.id;

    // 2. Submit contract to PENDING_APPROVAL
    await request.put(`/api/contracts/${contractId}/status`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
        'Content-Type': 'application/json',
      },
      data: { status: 'PENDING_APPROVAL' },
    });

    // 3. Approve the contract
    await request.put(`/api/contracts/${contractId}/status`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
        'Content-Type': 'application/json',
      },
      data: { status: 'APPROVED' },
    });
  });

  test.beforeEach(async ({ page, request }) => {
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

    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });
  });

  test('successfully edits a DRAFT invoice and updates flight line items', async ({ page, request }) => {
    const invNum = `INV-EDIT-${Date.now().toString().slice(-4)}`;

    // 1. Create Draft invoice via API
    const createRes = await request.post('/api/invoices', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: {
        supplierId: 'SWISSPORT',
        invoiceNumber: invNum,
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'USD',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
        lineItems: [
          {
            contractId: contractId,
            flightDate: '2026-03-05',
            flightNumber: 'EK101',
            aircraftReg: 'A6-EAA',
            origin: 'DXB',
            destination: 'LHR',
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDrivers: JSON.stringify({ passengers: 100 }),
            calculatedAmount: 1000,
          },
        ],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const invoice = await createRes.json();

    // 2. Open Invoices list
    await page.goto('/');
    await page.click('text=Invoices');
    await expect(page).toHaveURL(/\/invoices/);

    // 3. Locate invoice row and click Edit
    const invoiceRow = page.locator(`tr:has-text("${invNum}")`);
    await expect(invoiceRow).toBeVisible({ timeout: 10000 });
    const editBtn = invoiceRow.locator('[data-testid="edit-invoice-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 4. Verify navigation to /invoices/:id/edit
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoice.id}/edit`));
    await expect(page.locator('text=Edit Ground Handling Invoice')).toBeVisible();

    // 5. Navigate to Step 2 (Flight Line Items)
    await page.click('#invoice-wizard-next-btn');

    // 6. Update driver quantity value from 100 to 250
    const driverInput = page.locator('#lineItems_0_driverValue');
    await driverInput.fill('250');

    // 7. Navigate to Step 3 (Ledger Preview)
    await page.click('#invoice-wizard-next-btn');
    await expect(page.locator('text=Ledger Preview')).toBeVisible();

    // 8. Submit changes
    await page.click('#invoice-wizard-submit-btn');

    // 9. Verify success redirect and message
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.locator('body')).toContainText('Invoice updated successfully!');

    // 10. Verify backend updated total amount (250 * 10 = 2500)
    const getRes = await request.get(`/api/invoices/${invoice.id}`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
    });
    expect(getRes.ok()).toBeTruthy();
    const updatedInvoice = await getRes.json();
    expect(updatedInvoice.totalAmount).toBe(2500);
  });

  test('full revision cycle: MODIFICATION_REQUESTED invoice is edited, finalized, and approved', async ({ page, request }) => {
    const invNum = `INV-MOD-${Date.now().toString().slice(-4)}`;

    // 1. Create Draft invoice via API
    const createRes = await request.post('/api/invoices', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: {
        supplierId: 'SWISSPORT',
        invoiceNumber: invNum,
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'USD',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
        lineItems: [
          {
            contractId: contractId,
            flightDate: '2026-03-05',
            flightNumber: 'EK202',
            aircraftReg: 'A6-EBB',
            origin: 'DXB',
            destination: 'JFK',
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDrivers: JSON.stringify({ passengers: 50 }),
            calculatedAmount: 500,
          },
        ],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const invoice = await createRes.json();

    // 2. Transition: DRAFT -> FINALIZED -> MODIFICATION_REQUESTED
    await request.put(`/api/invoices/${invoice.id}/status?status=FINALIZED`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
    });

    await request.put(`/api/invoices/${invoice.id}/status?status=MODIFICATION_REQUESTED&comments=Please+verify+pax+count`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
    });

    // 3. Open Invoices list
    await page.goto('/');
    await page.click('text=Invoices');
    await expect(page).toHaveURL(/\/invoices/);

    // 4. Locate MODIFICATION_REQUESTED invoice and click Edit
    const invoiceRow = page.locator(`tr:has-text("${invNum}")`);
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow).toContainText('Mod Requested');
    const editBtn = invoiceRow.locator('[data-testid="edit-invoice-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 5. Update flight line items in wizard
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoice.id}/edit`));
    await page.click('#invoice-wizard-next-btn');
    const driverInput = page.locator('#lineItems_0_driverValue');
    await driverInput.fill('180');
    await page.click('#invoice-wizard-next-btn');
    await page.click('#invoice-wizard-submit-btn');

    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.locator('body')).toContainText('Invoice updated successfully!');

    // 6. Finalize the invoice
    const updatedRow = page.locator(`tr:has-text("${invNum}")`);
    const finalizeBtn = updatedRow.locator('[data-testid="finalize-invoice-btn"]');
    await finalizeBtn.click();
    await expect(page.locator('body')).toContainText('Invoice status updated to FINALIZED');

    // 7. Approve the invoice
    const finalizedRow = page.locator(`tr:has-text("${invNum}")`);
    const approveBtn = finalizedRow.locator(`#invoice-${invoice.id}-approve-btn`);
    await approveBtn.click();
    await expect(page.locator('body')).toContainText('Invoice status updated to APPROVED');

    // 8. Confirm Edit button is not visible on APPROVED invoice
    const approvedRow = page.locator(`tr:has-text("${invNum}")`);
    await expect(approvedRow).toContainText('APPROVED');
    await expect(approvedRow.locator('[data-testid="edit-invoice-btn"]')).not.toBeVisible();
  });
});
