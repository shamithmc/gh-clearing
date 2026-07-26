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

const supplierHeaders = {
  'Content-Type': 'application/json',
  'X-Mock-Tenant-Id': 'SWISSPORT',
  'X-Mock-Tenant-Type': 'GROUND_HANDLER',
  'X-Mock-User-Id': 'dev-SWISSPORT',
};

test('airline compares and accepts a proposal, creating a supplier draft contract', async ({ page }) => {
  const configuration = await page.request.put('/api/tenants/SWISSPORT/configuration', {
    headers: platformHeaders,
    data: {
      emailIds: 'rfp@swissport.test',
      invoiceBackdatingDays: 30,
      regionalClassification: 'MIDDLE_EAST',
      enabledAirlines: ['EK'],
      enabledAirports: ['DXB'],
    },
  });
  expect(configuration.ok()).toBeTruthy();

  const rfpResponse = await page.request.post('/api/rfps', {
    headers: airlineHeaders,
    data: {
      airportCode: 'DXB',
      serviceType: 'BAGGAGE',
      requirements: `Phase 7.3 proposal evaluation ${Date.now()}`,
      desiredStartDate: '2027-01-01',
      desiredEndDate: '2028-12-31',
    },
  });
  expect(rfpResponse.status()).toBe(201);
  const rfp = await rfpResponse.json();

  const proposalResponse = await page.request.post(`/api/supplier/rfps/${rfp.id}/proposals`, {
    headers: supplierHeaders,
    data: {
      proposedRate: 18.75,
      currency: 'USD',
      terms: 'Net 30. Rate fixed for twelve months.',
    },
  });
  expect(proposalResponse.status()).toBe(201);
  const supplierRfp = await proposalResponse.json();
  const proposalId = supplierRfp.proposalId;

  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'EK');
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simUserId', 'dev-EK');
  });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'RFPs' }).click();
  await expect(page).toHaveURL(/\/airline\/rfps$/);

  await page.getByTestId(`review-proposals-${rfp.id}`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('SWISSPORT')).toBeVisible();
  await expect(dialog.getByText('USD 18.75')).toBeVisible();
  await expect(dialog.getByText('Net 30. Rate fixed for twelve months.')).toBeVisible();

  const decisionRequest = page.waitForResponse(response =>
    response.url().endsWith(`/api/rfps/${rfp.id}/proposals/${proposalId}/decision`)
      && response.request().method() === 'POST');
  await page.getByTestId(`accept-proposal-${proposalId}`).click();
  const decisionResponse = await decisionRequest;
  expect(decisionResponse.ok()).toBeTruthy();
  const decision = await decisionResponse.json();
  expect(decision.proposalStatus).toBe('ACCEPTED');
  expect(decision.rfpStatus).toBe('AWARDED');
  expect(decision.seededContractId).toBeTruthy();

  await expect(dialog.getByText('This RFP has been awarded.')).toBeVisible();
  await expect(dialog.getByRole('cell', { name: 'ACCEPTED' })).toBeVisible();
  await expect(page.getByText(new RegExp(`Proposal accepted and draft contract ${decision.seededContractId}`))).toBeVisible();

  // Verify backend API contract seeding
  const contractsResponse = await page.request.get('/api/contracts', { headers: supplierHeaders });
  expect(contractsResponse.ok()).toBeTruthy();
  const contracts = await contractsResponse.json();
  const seededContract = contracts.find((contract: { id: string }) => contract.id === decision.seededContractId);
  expect(seededContract).toMatchObject({
    groundHandlerId: 'SWISSPORT',
    airlineId: 'EK',
    airportCode: 'DXB',
    status: 'DRAFT',
    currency: 'USD',
  });
  expect(seededContract.services[0]).toMatchObject({
    chargeCode: 'BAGGAGE',
    formulaType: 'PF-01',
  });
  expect(seededContract.services[0].rateDetails.rate).toBe(18.75);

  // Navigate to Ground Handler /contracts UI and verify pre-filled contract row
  await page.addInitScript(() => {
    localStorage.setItem('simTenantId', 'SWISSPORT');
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simUserId', 'dev-SWISSPORT');
  });
  await page.goto('/contracts');
  await page.waitForLoadState('networkidle');

  const contractRow = page.locator('tr').filter({ hasText: 'EK' }).filter({ hasText: 'DXB' }).filter({ hasText: 'DRAFT' }).first();
  await expect(contractRow).toBeVisible();
});
