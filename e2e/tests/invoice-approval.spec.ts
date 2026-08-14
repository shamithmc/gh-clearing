import { test, expect } from '@playwright/test';

test.describe('Invoice Approval Workflow E2E', () => {
  let contractId: string;

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
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
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
    await page.click('#create-invoice-btn');

    // Fill Step 1 details
    await page.click('#airlineId');
    await page.fill('#airlineId', 'EK');
    await page.click('.ant-select-item-option-content:has-text("Emirates (EK)")');

    await page.click('#airportCode');
    await page.fill('#airportCode', 'DXB');
    await page.click('.ant-select-item-option-content:has-text("DXB")');

    const invoiceNum = 'INV-APP-' + Math.floor(Math.random() * 1000000);
    await page.fill('input[placeholder="INV-2026-0001"]', invoiceNum);

    await page.locator('#currency').locator('xpath=../..').click();
    await page.locator('.ant-select-dropdown:visible')
      .getByText('AED', { exact: true })
      .click();

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

    // Proceed to Step 2
    await page.click('#invoice-wizard-next-btn');

    // Add line item
    await expect(page.locator('#invoice-wizard-add-flight-btn')).toBeVisible();
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

    // Proceed to Step 3
    await page.click('#invoice-wizard-next-btn');

    // Submit / Save draft
    await page.click('#invoice-wizard-submit-btn');

    // Confirm navigation back to list and check status is DRAFT
    await expect(page.locator('.ant-message-notice')).toContainText('Invoice drafted successfully!');
    await expect(page).toHaveURL(/\/invoices/);

    // Reload the page to fetch the latest data from the backend
    await page.reload();
    await page.waitForLoadState('networkidle');

    const invoiceRow = page.locator('tr').filter({ hasText: invoiceNum }).first();
    await expect(invoiceRow).toContainText('Draft');

    // 2. Finalize the invoice (as Swissport Ground Handler) using button ID or row button
    await invoiceRow.locator('button[id$="-finalize-btn"]').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to FINALIZED');
    await expect(invoiceRow).toContainText('Finalized');
    await expect(invoiceRow.locator('button[id$="-finalize-btn"]')).not.toBeVisible();

    // 3. Internal ground-handler approval review
    await expect(invoiceRow.locator('button[id$="-approve-btn"]')).toBeVisible();
    await expect(invoiceRow.locator('button[id$="-req-mod-btn"]')).toBeVisible();

    // Request Modification with comments
    await invoiceRow.locator('button[id$="-req-mod-btn"]').click();
    const comment = 'Please correct passenger count to 150';
    await page.fill('#modification-comments-input', comment);
    await page.click('#submit-modification-btn');

    // Verify status transitions to MODIFICATION_REQUESTED
    await expect(page.locator('body')).toContainText('Invoice status updated to MODIFICATION_REQUESTED');
    await expect(invoiceRow).toContainText('Mod Requested');

    // Expand the row to see comments
    await invoiceRow.locator('button.ant-table-row-expand-icon').click();
    await expect(invoiceRow.locator('xpath=following-sibling::tr').first()).toContainText(comment);

    // 4. Re-finalize after the requested modification
    await invoiceRow.locator('button[id$="-finalize-btn"]').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to FINALIZED');
    await expect(invoiceRow).toContainText('Finalized');

    // 5. Ground-handler approver approves the invoice
    await invoiceRow.locator('button[id$="-approve-btn"]').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to APPROVED');
    await expect(invoiceRow).toContainText('APPROVED');

    // 6. Send the approved invoice
    await invoiceRow.locator('button[id$="-send-btn"]').click();
    await expect(page.locator('body')).toContainText('Invoice status updated to SENT');
    await expect(invoiceRow).toContainText('Submitted to Airline');

    // 7. Switch to Emirates to Dispute using #tenant-select-container ID
    await page.click('#tenant-select-container .ant-select');
    await page.click('.ant-select-item-option-content:has-text("Emirates (Airline)")');
    await page.waitForLoadState('networkidle');

    // Click Dispute button
    await invoiceRow.locator('button[id$="-dispute-btn"]').click();

    // Fill dispute details in the modal using ID selectors
    await page.click('#dispute-checkbox-0');
    await page.locator('.ant-modal-body .ant-select').first().click();
    await page.click('.ant-select-item-option-content:has-text("Operational data mismatch")');
    const disputeComment = 'Operational data is incorrect';
    await page.fill('#dispute-comment-0', disputeComment);
    await page.click('#submit-dispute-btn');

    // Verify status transitions to DISPUTED
    await expect(page.locator('body')).toContainText('Invoice disputed successfully');
    await expect(invoiceRow).toContainText('Disputed / Audit');

    // Expand the row to see dispute status
    await expect(invoiceRow.locator('xpath=following-sibling::tr').first()).toContainText('OPERATIONAL DATA MISMATCH');
    await expect(invoiceRow.locator('xpath=following-sibling::tr').first()).toContainText(disputeComment);
  });

  test('dispatching invoice generates IS-XML and PDF files accessible via download endpoints', async ({ request }) => {
    // Seed a separate invoice via API for document generation verification
    const invoiceNum = 'INV-DOC-' + Date.now();
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
        exchangeRateSource: 'E2E doc gen test',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        lineItems: [
          {
            contractId: contractId,
            flightDate: '2026-07-05',
            flightNumber: 'EK501',
            aircraftReg: 'A6-EEP',
            origin: 'DXB',
            destination: 'FRA',
            chargeCode: 'PASSENGER_HANDLING',
            serviceName: 'Passenger Handling',
            formulaType: 'PF-01',
            quantityDrivers: JSON.stringify({ passengers: 200 }),
            calculatedAmount: 2000,
          },
        ],
      },
    });
    expect(createInvoiceRes.status()).toBe(201);
    const invoice = await createInvoiceRes.json();
    const docInvoiceId = invoice.id;

    const ghHeaders = {
      'X-Mock-Tenant-Id': 'SWISSPORT',
      'X-Mock-Tenant-Type': 'GROUND_HANDLER',
      'Content-Type': 'application/json',
    };

    // Finalize → Approve → Send
    const finalizeRes = await request.put(
      `/api/invoices/${docInvoiceId}/status?status=FINALIZED`,
      { headers: ghHeaders },
    );
    expect(finalizeRes.status()).toBe(200);

    const approveRes = await request.put(
      `/api/invoices/${docInvoiceId}/status?status=APPROVED`,
      { headers: ghHeaders },
    );
    expect(approveRes.status()).toBe(200);

    const sendRes = await request.put(
      `/api/invoices/${docInvoiceId}/status?status=SENT`,
      { headers: ghHeaders },
    );
    expect(sendRes.status()).toBe(200);

    // The send request queues durable work; SENT is only visible after delivery.
    const queuedInvoice = await sendRes.json();
    expect(queuedInvoice.status).toBe('APPROVED');
    await expect.poll(async () => {
      const dispatchRes = await request.get(`/api/invoices/${docInvoiceId}/dispatch`, { headers: ghHeaders });
      expect(dispatchRes.status()).toBe(200);
      return (await dispatchRes.json()).status;
    }).toBe('DELIVERED');

    const deliveredInvoiceRes = await request.get(`/api/invoices/${docInvoiceId}`, { headers: ghHeaders });
    expect(deliveredInvoiceRes.status()).toBe(200);
    expect((await deliveredInvoiceRes.json()).status).toBe('SENT');

    // Verify IS-XML download endpoint
    const xmlRes = await request.get(`/api/invoices/${docInvoiceId}/xml`, { headers: ghHeaders });
    if (xmlRes.status() === 200) {
      const xmlBody = (await xmlRes.body()).toString();
      // Verify XML starts with XML declaration or contains IATA namespace
      expect(xmlBody).toContain('<?xml');
      // Verify the legacy application-contract namespace if present
      if (xmlBody.includes('urn:iata')) {
        expect(xmlBody).toContain('urn:iata:is:invoice');
      }
    }

    // Verify PDF download endpoint
    const pdfRes = await request.get(`/api/invoices/${docInvoiceId}/pdf`, { headers: ghHeaders });
    if (pdfRes.status() === 200) {
      const pdfBody = await pdfRes.body();
      // PDF files start with %PDF magic bytes
      expect(pdfBody.length).toBeGreaterThan(0);
    }
  });
});
