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

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const plusDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

test('airline explores current footprint values and contract invoice drill-downs', async ({ page }) => {
  const suffix = Date.now();
  const supplierA = `AOR2A${suffix}`;
  const supplierB = `AOR2B${suffix}`;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);

  const provisionSupplier = async (supplierId: string) => {
    expect((await page.request.post('/api/tenants', {
      headers: platformHeaders,
      data: { id: supplierId, name: supplierId, type: 'GROUND_HANDLER' },
    })).status()).toBe(201);
    expect((await page.request.post(`/api/tenants/${supplierId}/users`, {
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
    })).status()).toBe(201);
  };

  const createContract = async (
    supplierId: string,
    airportCode: string,
    serviceType: string,
    currency: string,
    rate: number,
    expectedAmount: number,
  ) => {
    const response = await page.request.post('/api/contracts', {
      headers: supplierHeaders(supplierId),
      data: {
        airlineId: 'EK',
        airportCode,
        startDate: isoDate(plusDays(today, -30)),
        endDate: isoDate(plusDays(today, 90)),
        currency,
        services: [{
          chargeCode: serviceType,
          serviceName: `Phase 8.6 ${serviceType}`,
          formulaType: 'PF-01',
          quantityDriver: 'events',
          uom: 'EA',
          billingFrequency: 'MONTHLY',
          rateDetails: { rate, expectedAmount },
        }],
      },
    });
    expect(response.status()).toBe(201);
    const contract = await response.json();
    for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
      expect((await page.request.put(`/api/contracts/${contract.id}/status`, {
        headers: supplierHeaders(supplierId),
        data: { status },
      })).ok()).toBeTruthy();
    }
    return contract;
  };

  const createSentInvoice = async (
    supplierId: string,
    contractId: string,
    serviceType: string,
    airportCode: string,
    currency: string,
  ) => {
    const response = await page.request.post('/api/invoices', {
      headers: supplierHeaders(supplierId),
      data: {
        invoiceNumber: `AOR2-${supplierId}`,
        supplierId,
        airlineId: 'EK',
        airportCode,
        currency,
        exchangeRate: 1,
        exchangeRateSource: 'Phase 8.6 E2E',
        issueDate: isoDate(plusDays(today, -5)),
        dueDate: isoDate(plusDays(today, 25)),
        totalAmount: 0,
        lineItems: [{
          flightDate: isoDate(plusDays(today, -6)),
          flightNumber: 'EK846',
          aircraftReg: 'A6-AOR',
          aircraftType: 'A380',
          origin: airportCode,
          destination: 'FRA',
          chargeCode: serviceType,
          serviceName: `Phase 8.6 ${serviceType}`,
          formulaType: 'PF-01',
          quantityDrivers: JSON.stringify({ events: 5 }),
          calculatedAmount: 0,
          contractId,
        }],
      },
    });
    expect(response.status()).toBe(201);
    const invoice = await response.json();
    for (const status of ['FINALIZED', 'APPROVED', 'SENT']) {
      expect((await page.request.put(`/api/invoices/${invoice.id}/status?status=${status}`, {
        headers: supplierHeaders(supplierId),
      })).ok()).toBeTruthy();
    }
    return invoice;
  };

  await provisionSupplier(supplierA);
  await provisionSupplier(supplierB);
  const contractA = await createContract(
    supplierA, 'DXB', 'BAGGAGE', 'USD', 20, 200,
  );
  await createContract(supplierB, 'LHR', 'CLEANING', 'EUR', 15, 150);
  const invoiceA = await createSentInvoice(
    supplierA, contractA.id, 'BAGGAGE', 'DXB', 'USD',
  );

  const reportResponse = await page.request.get(
    `/api/airline/reports/current-footprint?supplierId=${supplierA}`
      + '&airportCode=DXB&serviceType=BAGGAGE&currency=USD&historyMonths=12',
    { headers: airlineHeaders },
  );
  expect(reportResponse.ok()).toBeTruthy();
  const report = await reportResponse.json();
  expect(report.summary).toEqual({
    airportCount: 1,
    supplierCount: 1,
    serviceCount: 1,
    activeContractCount: 1,
    dispatchedInvoiceCount: 1,
  });
  expect(report.airports).toEqual([expect.objectContaining({
    airportCode: 'DXB',
    suppliers: [supplierA],
    serviceTypes: ['BAGGAGE'],
    financials: [expect.objectContaining({
      currency: 'USD',
      monthlyContractValue: 200,
      invoicedValue: 100,
      invoiceCount: 1,
    })],
  })]);
  expect(report.contracts).toEqual([expect.objectContaining({
    contractId: contractA.id,
    services: [expect.objectContaining({
      serviceType: 'BAGGAGE',
      monthlyExpectedValue: 200,
    })],
  })]);
  expect(report.invoices).toEqual([expect.objectContaining({
    invoiceId: invoiceA.id,
    invoiceNumber: `AOR2-${supplierA}`,
    invoicedValue: 100,
  })]);

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Current Footprint' })).toBeVisible();

  const supplierFilter = page.getByTestId('aor2-supplier-filter');
  await supplierFilter.click();
  await supplierFilter.getByRole('combobox').fill(supplierA);
  const filteredReport = page.waitForResponse(response =>
    response.ok()
      && response.url().includes('/api/airline/reports/current-footprint')
      && response.url().includes(`supplierId=${supplierA}`));
  await page.locator('.ant-select-item-option-content').filter({ hasText: supplierA }).click();
  await filteredReport;

  await expect(page.getByTestId('aor2-airports')).toContainText('1');
  await expect(page.getByTestId('aor2-suppliers')).toContainText('1');
  await expect(page.getByTestId('aor2-services')).toContainText('1');
  await expect(page.getByTestId('aor2-invoices')).toContainText('1');
  const marker = page.getByTestId('aor2-map-DXB');
  await marker.hover();
  const hoverCard = page.getByTestId('aor2-hover-DXB');
  await expect(hoverCard).toContainText(supplierA);
  await expect(hoverCard).toContainText('BAGGAGE');
  await expect(hoverCard).toContainText('USD 200.00');
  await expect(hoverCard).toContainText('USD 100.00');

  await marker.click();
  const contractTable = page.getByTestId('aor2-contract-table');
  await expect(contractTable.getByRole('row').filter({ hasText: supplierA }))
    .toContainText('USD 200.00');

  await page.getByRole('tab', { name: /Invoices \(1\)/ }).click();
  const invoiceTable = page.getByTestId('aor2-invoice-table');
  const invoiceRow = invoiceTable.getByRole('row').filter({
    hasText: `AOR2-${supplierA}`,
  });
  await expect(invoiceRow).toContainText('BAGGAGE');
  await expect(invoiceRow).toContainText('USD 100.00');
  await expect(invoiceTable).not.toContainText(supplierB);
});
