import { expect, test } from '@playwright/test';

const platformHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'PLATFORM',
  'X-Mock-Tenant-Type': 'PLATFORM_ADMIN',
  'X-Mock-User-Id': 'dev-PLATFORM',
};

const airlineHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'EK',
  'X-Mock-Tenant-Type': 'AIRLINE',
  'X-Mock-User-Id': 'dev-EK',
};

const supplierHeaders = (supplierId: string) => ({
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': supplierId,
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': `dev-${supplierId}`,
});

test('airline explores billed amounts and drills down to tenant invoices', async ({ page }) => {
  const suffix = Date.now();
  const supplierA = `AFR1A${suffix}`;
  const supplierB = `AFR1B${suffix}`;

  const provisionSupplier = async (supplierId: string) => {
    const createTenant = await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: supplierId, name: supplierId, type: 'GROUND_HANDLER' },
    });
    expect(createTenant.status()).toBe(201);
    const createUser = await page.request.post(`/api/tenants/${supplierId}/users`, {
      headers: platformHeaders,
      data: {
        id: `dev-${supplierId}`,
        username: `dev-${supplierId}`,
        email: `${supplierId.toLowerCase()}@local.invalid`,
        roles: ['ADMIN', 'CONTRACT_ENTRY', 'CONTRACT_APPROVER', 'INVOICE_ENTRY', 'INVOICE_APPROVER'],
        airportRestrictions: [],
        airlineRestrictions: [],
        chargeCodeRestrictions: [],
      },
    });
    expect(createUser.status()).toBe(201);
  };

  await provisionSupplier(supplierA);
  await provisionSupplier(supplierB);

  const createInvoice = async (
    supplierId: string,
    rate: number,
    flightNumber: string,
  ) => {
    const contractResponse = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode: 'DXB',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'USD',
        services: [{
          chargeCode: 'BAGGAGE',
          serviceName: 'Phase 8.3 Baggage',
          formulaType: 'PF-01',
          quantityDriver: 'bags',
          uom: 'EA',
          taxCode: 'VAT-0',
          rateDetails: { rate },
        }],
      },
    });
    expect(contractResponse.status()).toBe(201);
    const contract = await contractResponse.json();
    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      });
      expect(transition.ok()).toBeTruthy();
    }

    const invoiceResponse = await page.request.post('/api/invoices', {
      headers: supplierHeaders(supplierId),
      data: {
        invoiceNumber: `AFR1-${supplierId}`,
        supplierId,
        airlineId: 'EK',
        airportCode: 'DXB',
        currency: 'USD',
        exchangeRate: 1,
        exchangeRateSource: 'Phase 8.3 E2E',
        issueDate: '2026-08-01',
        dueDate: '2026-08-31',
        totalAmount: 0,
        lineItems: [{
          flightDate: '2026-08-02',
          flightNumber,
          aircraftReg: 'A6-AFR',
          aircraftType: 'A380',
          origin: 'DXB',
          destination: 'FRA',
          chargeCode: 'BAGGAGE',
          serviceName: 'Phase 8.3 Baggage',
          formulaType: 'PF-01',
          quantityDrivers: JSON.stringify({ bags: 10 }),
          calculatedAmount: 0,
          contractId: contract.id,
        }],
      },
    });
    expect(invoiceResponse.status()).toBe(201);
    const invoice = await invoiceResponse.json();
    for (const status of ['FINALIZED', 'APPROVED', 'SENT']) {
      const transition = await page.request.put(`/api/invoices/${invoice.id}/status?status=${status}`, {
        headers: supplierHeaders(supplierId),
      });
      expect(transition.ok()).toBeTruthy();
    }
    return invoice;
  };

  const outstandingInvoice = await createInvoice(supplierA, 10, 'EK831');
  const paidInvoice = await createInvoice(supplierB, 15, 'EK832');
  const markPaid = await page.request.put(`/api/invoices/${paidInvoice.id}/status?status=PAID`, {
    headers: airlineHeaders,
  });
  expect(markPaid.ok()).toBeTruthy();

  const supplierReportResponse = await page.request.get(
    `/api/airline/reports/billed-amounts?supplierId=${supplierA}&airportCode=DXB&serviceType=BAGGAGE&startDate=2026-08-01&endDate=2026-08-31`,
    { headers: airlineHeaders },
  );
  expect(supplierReportResponse.ok()).toBeTruthy();
  const supplierReport = await supplierReportResponse.json();
  expect(supplierReport.summaries).toEqual([expect.objectContaining({
    currency: 'USD',
    totalBilled: 100,
    totalPaid: 0,
    totalOutstanding: 100,
    invoiceCount: 1,
  })]);
  expect(supplierReport.bySupplier).toEqual([expect.objectContaining({ key: supplierA })]);
  expect(supplierReport.byAirport).toEqual([expect.objectContaining({ key: 'DXB' })]);
  expect(supplierReport.byService).toEqual([expect.objectContaining({
    key: 'BAGGAGE',
    totalBilled: 100,
  })]);
  expect(supplierReport.invoices).toEqual([expect.objectContaining({
    id: outstandingInvoice.id,
    invoiceNumber: `AFR1-${supplierA}`,
    supplierId: supplierA,
    status: 'SENT',
  })]);

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Billed Amounts' })).toBeVisible();

  const supplierFilter = page.getByTestId('afr1-supplier-filter');
  await supplierFilter.click();
  await supplierFilter.getByRole('combobox').fill(supplierA);
  const filteredReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/airline/reports/billed-amounts')
      && response.url().includes(`supplierId=${supplierA}`));
  await page.locator('.ant-select-item-option-content').filter({ hasText: supplierA }).click();
  await filteredReport;

  await expect(page.getByTestId('afr1-total-billed')).toContainText('USD');
  await expect(page.getByTestId('afr1-total-billed')).toContainText('100.00');
  await expect(page.getByTestId('afr1-total-outstanding')).toContainText('100.00');
  await expect(page.getByTestId('afr1-invoice-count')).toContainText('1');
  await expect(page.getByTestId(`supplier-pie-${supplierA}`)).toBeVisible();
  await expect(page.getByTestId('afr1-airport-bar-DXB')).toBeVisible();
  await expect(page.getByTestId('afr1-service-bar-BAGGAGE')).toBeVisible();

  const invoiceTable = page.getByTestId('afr1-invoice-table');
  const invoiceRow = invoiceTable.getByRole('row').filter({ hasText: `AFR1-${supplierA}` });
  await expect(invoiceRow).toContainText(supplierA);
  await expect(invoiceRow).toContainText('BAGGAGE');
  await expect(invoiceRow).toContainText('USD 100.00');
  await expect(invoiceTable.getByText(`AFR1-${supplierB}`)).toHaveCount(0);

  await page.getByRole('button', { name: 'Open Invoice Workspace' }).click();
  await expect(page).toHaveURL(/\/airline\/invoices$/);
});
