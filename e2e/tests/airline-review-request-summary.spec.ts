import { expect, test } from '@playwright/test';

const groundHandlerHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

const airlineHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'EK',
  'X-Mock-Tenant-Type': 'AIRLINE',
  'X-Mock-User-Id': 'dev-EK',
};

test('airline sees its sent contract review request with supplier, service, and status', async ({ page }) => {
  const createdResponse = await page.request.post('/api/contracts', {
    headers: groundHandlerHeaders,
    data: {
      airlineId: 'EK',
      airportCode: 'DXB',
      startDate: '2027-01-01',
      endDate: '2028-12-31',
      currency: 'USD',
      services: [{
        chargeCode: 'BAGGAGE',
        serviceName: 'Phase 7.6 Review Summary Baggage',
        formulaType: 'PF-01',
        quantityDriver: 'bags',
        uom: 'EA',
        taxCode: 'VAT-0',
        rateDetails: { rate: 12.5 },
      }],
    },
  });
  expect(createdResponse.status()).toBe(201);
  const contract = await createdResponse.json();

  for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
    const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
      headers: groundHandlerHeaders,
      data: { status },
    });
    expect(transition.ok()).toBeTruthy();
  }

  const comment = `Phase 7.6 review history ${Date.now()}`;
  const requestResponse = await page.request.post(`/api/contracts/${contract.id}/review-requests`, {
    headers: airlineHeaders,
    data: { comment },
  });
  expect(requestResponse.status()).toBe(201);
  const reviewRequest = await requestResponse.json();

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.reload();
  await page.getByRole('menuitem', { name: 'Review Requests' }).click();

  await expect(page).toHaveURL(/\/airline\/review-requests$/);
  await expect(page.getByRole('heading', { name: 'Review Requests Sent' })).toBeVisible();
  const row = page.locator(`#airline-review-request-${reviewRequest.id}`);
  await expect(row).toContainText('SWISSPORT');
  await expect(row).toContainText('DXB');
  await expect(row).toContainText('BAGGAGE');
  await expect(row).toContainText('APPROVED');
  await expect(row).toContainText(comment);

  const serviceFilter = page.getByTestId('review-summary-service-filter');
  await serviceFilter.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option-content')
    .filter({ hasText: /^BAGGAGE$/ })
    .click();
  await expect(row).toBeVisible();

  const historyResponse = await page.request.get('/api/airline/contract-review-requests', {
    headers: airlineHeaders,
  });
  expect(historyResponse.ok()).toBeTruthy();
  const history = await historyResponse.json();
  expect(history.find((item: { id: string }) => item.id === reviewRequest.id)).toMatchObject({
    groundHandlerId: 'SWISSPORT',
    airportCode: 'DXB',
    contractStatus: 'APPROVED',
    serviceTypes: ['BAGGAGE'],
  });
});
