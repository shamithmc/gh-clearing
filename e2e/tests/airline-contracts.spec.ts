import { expect, test } from '@playwright/test';

const groundHandlerHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

test('airline contract viewer is read-only and filters by airport and service type', async ({ page }) => {
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
        serviceName: 'Phase 6.3 E2E Baggage',
        formulaType: 'PF-01',
        quantityDriver: 'bags',
        uom: 'EA',
        taxCode: 'VAT-0',
        rateDetails: { rate: 8.75 },
      }],
    },
  });
  expect(createdResponse.ok()).toBeTruthy();
  const created = await createdResponse.json();

  for (const status of ['PENDING_APPROVAL', 'APPROVED']) {
    const transition = await page.request.put(`/api/contracts/${created.id}/status`, {
      headers: groundHandlerHeaders,
      data: { status },
    });
    expect(transition.ok()).toBeTruthy();
  }

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Contracts' }).click();

  await expect(page).toHaveURL(/\/airline\/contracts$/);
  await expect(page.getByRole('heading', { name: 'My Contracts' })).toBeVisible();
  await expect(page.getByText('Read only')).toBeVisible();
  await expect(page.getByRole('button', { name: /Create Contract/i })).toHaveCount(0);

  const contractIdPrefix = created.id.slice(0, 8);
  await expect(page.getByText(`${contractIdPrefix}…`)).toBeVisible();

  const airportSelect = page.getByTestId('airport-filter');
  const airportFilter = airportSelect.getByRole('combobox', { name: 'Airport filter' });
  await airportSelect.click();
  await airportFilter.fill('FRA');
  await airportFilter.press('Enter');
  await expect(page.getByText(`${contractIdPrefix}…`)).toHaveCount(0);

  await airportSelect.click();
  await airportFilter.fill('DXB');
  await airportFilter.press('Enter');
  await expect(page.getByText(`${contractIdPrefix}…`)).toBeVisible();

  const serviceTypeSelect = page.getByTestId('service-type-filter');
  const serviceTypeFilter = serviceTypeSelect.getByRole('combobox', { name: 'Service type filter' });
  await serviceTypeSelect.click();
  await serviceTypeFilter.fill('PASSENGER_HANDLING');
  await serviceTypeFilter.press('Enter');
  await expect(page.getByText(`${contractIdPrefix}…`)).toHaveCount(0);

  await serviceTypeSelect.click();
  await serviceTypeFilter.fill('BAGGAGE');
  await serviceTypeFilter.press('Enter');
  await expect(page.getByText(`${contractIdPrefix}…`)).toBeVisible();
});
