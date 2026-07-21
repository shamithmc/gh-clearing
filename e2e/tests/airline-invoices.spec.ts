import { expect, test } from '@playwright/test';

const groundHandlerHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

const airlineHeaders = {
  'X-Mock-Tenant-Id': 'EK',
  'X-Mock-Tenant-Type': 'AIRLINE',
  'X-Mock-User-Id': 'dev-EK',
};

test('airline views only dispatched invoices, filters them, and downloads XML and PDF', async ({ page }) => {
  const contractResponse = await page.request.post('/api/contracts', {
    headers: groundHandlerHeaders,
    data: {
      airlineId: 'EK',
      airportCode: 'DXB',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currency: 'USD',
      services: [{
        chargeCode: 'BAGGAGE',
        serviceName: 'Phase 6.5 Baggage',
        formulaType: 'PF-01',
        quantityDriver: 'bags',
        uom: 'EA',
        taxCode: 'VAT-0',
        rateDetails: { rate: 9.5 },
      }],
    },
  });
  expect(contractResponse.ok()).toBeTruthy();
  const contract = await contractResponse.json();

  for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
    const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
      headers: groundHandlerHeaders,
      data: { status },
    });
    expect(transition.ok()).toBeTruthy();
  }

  const createInvoice = async (invoiceNumber: string) => {
    const response = await page.request.post('/api/invoices', {
      headers: groundHandlerHeaders,
      data: {
        invoiceNumber,
        supplierId: 'SWISSPORT',
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'USD',
        exchangeRate: 1,
        exchangeRateSource: 'Phase 6.5 E2E',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        totalAmount: 0,
        lineItems: [{
          flightDate: '2026-07-02',
          flightNumber: 'EK651',
          aircraftReg: 'A6-EQA',
          origin: 'DXB',
          destination: 'FRA',
          chargeCode: 'BAGGAGE',
          serviceName: 'Phase 6.5 Baggage',
          formulaType: 'PF-01',
          quantityDrivers: JSON.stringify({ bags: 3 }),
          calculatedAmount: 0,
          contractId: contract.id,
        }],
      },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };

  const suffix = Date.now();
  const sentNumber = `INV-AIR-${suffix}`;
  const draftNumber = `INV-HIDDEN-${suffix}`;
  const sentInvoice = await createInvoice(sentNumber);
  await createInvoice(draftNumber);

  for (const status of ['FINALIZED', 'APPROVED', 'SENT']) {
    const transition = await page.request.put(`/api/invoices/${sentInvoice.id}/status?status=${status}`, {
      headers: groundHandlerHeaders,
    });
    expect(transition.ok()).toBeTruthy();
  }

  await expect.poll(async () => {
    const response = await page.request.get(`/api/invoices/${sentInvoice.id}`, {
      headers: groundHandlerHeaders,
    });
    if (!response.ok()) return false;
    const invoice = await response.json();
    return Boolean(invoice.xmlFileKey && invoice.pdfFileKey);
  }, { timeout: 15000 }).toBeTruthy();

  const hiddenStatusResponse = await page.request.get('/api/invoices?status=DRAFT', {
    headers: airlineHeaders,
  });
  expect(hiddenStatusResponse.ok()).toBeTruthy();
  expect(await hiddenStatusResponse.json()).toEqual([]);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.reload();
  await page.getByRole('menuitem', { name: 'Invoices' }).click();

  await expect(page).toHaveURL(/\/airline\/invoices$/);
  await expect(page.getByRole('heading', { name: 'My Invoices' })).toBeVisible();
  await expect(page.getByText(sentNumber)).toBeVisible();
  const invoiceRow = page.getByRole('row').filter({ hasText: sentNumber });
  await expect(page.getByText(draftNumber)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Create Invoice/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Approve|Dispute/i })).toHaveCount(0);
  await expect(invoiceRow.getByRole('button', { name: 'Mark as Paid' })).toBeVisible();

  const statusSelect = page.getByTestId('invoice-status-filter');
  const statusFilter = statusSelect.getByRole('combobox', { name: 'Invoice status filter' });
  await statusSelect.click();
  await statusFilter.fill('PAID');
  await statusFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toHaveCount(0);
  await statusSelect.click();
  await statusFilter.fill('SENT');
  await statusFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toBeVisible();

  const airportSelect = page.getByTestId('invoice-airport-filter');
  const airportFilter = airportSelect.getByRole('combobox', { name: 'Invoice airport filter' });
  await airportSelect.click();
  await airportFilter.fill('FRA');
  await airportFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toHaveCount(0);
  await airportSelect.click();
  await airportFilter.fill('DXB');
  await airportFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toBeVisible();

  const serviceSelect = page.getByTestId('invoice-service-filter');
  const serviceFilter = serviceSelect.getByRole('combobox', { name: 'Invoice service type filter' });
  await serviceSelect.click();
  await serviceFilter.fill('CLEANING');
  await serviceFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toHaveCount(0);
  await serviceSelect.click();
  await serviceFilter.fill('BAGGAGE');
  await serviceFilter.press('Enter');
  await expect(page.getByText(sentNumber)).toBeVisible();

  const [xmlDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: `Download XML ${sentNumber}` }).click(),
  ]);
  expect(xmlDownload.suggestedFilename()).toBe(`invoice-${sentNumber}.xml`);

  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: `Download PDF ${sentNumber}` }).click(),
  ]);
  expect(pdfDownload.suggestedFilename()).toBe(`invoice-${sentNumber}.pdf`);

  await invoiceRow.getByRole('button', { name: 'Mark as Paid' }).click();
  await page.getByRole('button', { name: 'Mark Paid', exact: true }).click();
  await expect(page.getByText(`Invoice ${sentNumber} marked as paid`)).toBeVisible();
  await expect(page.getByText(sentNumber)).toHaveCount(0);

  await statusSelect.click();
  await statusFilter.fill('PAID');
  await statusFilter.press('Enter');
  const paidRow = page.getByRole('row').filter({ hasText: sentNumber });
  await expect(paidRow).toContainText('PAID');
  await expect(paidRow.getByRole('button', { name: 'Mark as Paid' })).toHaveCount(0);

  const supplierInvoiceResponse = await page.request.get(`/api/invoices/${sentInvoice.id}`, {
    headers: groundHandlerHeaders,
  });
  expect(supplierInvoiceResponse.ok()).toBeTruthy();
  expect((await supplierInvoiceResponse.json()).status).toBe('PAID');

  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Invoices' }).click();
  const supplierRow = page.getByRole('row').filter({ hasText: sentNumber });
  await expect(supplierRow).toContainText('PAID');
});
