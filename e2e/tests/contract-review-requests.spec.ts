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

test('airline requests an approved contract review and ground handler sees the comment', async ({ page }) => {
  const createdResponse = await page.request.post('/api/contracts', {
    headers: groundHandlerHeaders,
    data: {
      airlineId: 'EK',
      airportCode: 'DXB',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currency: 'USD',
      services: [{
        chargeCode: 'BAGGAGE',
        serviceName: 'Phase 6.4 Reviewable Baggage',
        formulaType: 'PF-01',
        quantityDriver: 'bags',
        uom: 'EA',
        taxCode: 'VAT-0',
        rateDetails: { rate: 11.25 },
      }],
    },
  });
  expect(createdResponse.ok()).toBeTruthy();
  const contract = await createdResponse.json();

  for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
    const transition = await page.request.put(`/api/contracts/${contract.id}/status`, {
      headers: groundHandlerHeaders,
      data: { status },
    });
    expect(transition.ok()).toBeTruthy();
  }

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.reload();
  await page.getByRole('menuitem', { name: 'Contracts' }).click();

  const prefix = contract.id.slice(0, 8);
  const contractRow = page.getByRole('row').filter({ hasText: prefix });
  await expect(contractRow).toContainText('APPROVED');
  await contractRow.getByRole('button', { name: 'Request Review' }).click();

  const comment = `Please review baggage pricing for ${prefix}`;
  await page.getByRole('textbox', { name: 'Review comment' }).fill(comment);
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByText('Review request sent to the ground handler')).toBeVisible();

  const approvedContracts = await page.request.get('/api/contracts?status=APPROVED', {
    headers: airlineHeaders,
  });
  expect(approvedContracts.ok()).toBeTruthy();
  const approvedBody = await approvedContracts.json();
  expect(approvedBody.some((item: { id: string }) => item.id === contract.id)).toBeTruthy();

  await page.evaluate(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Review Requests' }).click();

  await expect(page).toHaveURL(/\/review-requests$/);
  await expect(page.getByRole('heading', { name: 'Contract Review Requests' })).toBeVisible();
  const requestRow = page.getByRole('row').filter({ hasText: prefix });
  await expect(requestRow).toContainText('EK');
  await expect(requestRow).toContainText('DXB');
  await expect(requestRow).toContainText(comment);
  await expect(requestRow).toContainText('APPROVED');
});
