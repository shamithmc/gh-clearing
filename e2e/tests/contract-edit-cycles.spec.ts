import { test, expect } from '@playwright/test';

test.describe('Contract Edit Cycles and Revision Workflow E2E', () => {
  test.beforeEach(async ({ page, request }) => {
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

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
  });

  test('successfully edits a DRAFT contract and updates pricing formulas', async ({ page, request }) => {
    // 1. Create a Draft contract via API
    const createRes = await request.post('/api/contracts', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
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
            serviceName: 'Standard Passenger Handling',
            formulaType: 'PF-01',
            quantityDriver: 'passengers',
            uom: 'PAX',
            taxCode: 'VAT-0',
            rateDetails: { rate: 12.0 },
          },
        ],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const contract = await createRes.json();

    // 2. Navigate to Contracts List
    await page.goto('/');
    await page.click('text=Contracts');
    await expect(page).toHaveURL(/\/contracts/);

    // 3. Locate the created contract row and click Edit
    const contractRow = page.locator(`tr:has-text("${contract.id.substring(0, 8)}")`);
    await expect(contractRow).toBeVisible({ timeout: 10000 });
    const editBtn = contractRow.locator('[data-testid="edit-contract-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 4. Verify navigation to /contracts/:id/edit and preloaded values
    await expect(page).toHaveURL(new RegExp(`/contracts/${contract.id}/edit`));
    await expect(page.locator('text=Edit Ground Handling Agreement (SGHA)')).toBeVisible();

    // 5. Navigate to Step 2 (Service Configuration)
    await page.click('#contract-wizard-next-btn');

    // 6. Update rate on existing service line
    await page.fill('#services_0_rate', '18.75');

    // 7. Navigate to Step 3 (Review)
    await page.click('#contract-wizard-next-btn');
    await expect(page.locator('text=Contract Agreement Review')).toBeVisible();

    // 8. Submit changes
    await page.click('#contract-wizard-submit-btn');

    // 9. Verify success redirect and message
    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract updated successfully!');

    // 10. Verify backend received the update
    const getRes = await request.get(`/api/contracts/${contract.id}`, {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
    });
    expect(getRes.ok()).toBeTruthy();
    const updatedContract = await getRes.json();
    expect(updatedContract.services[0].rateDetails.rate).toBe(18.75);
  });

  test('full revision cycle: REVIEW_REQUESTED contract is edited, resubmitted, and approved', async ({ page, request }) => {
    // 1. Create a contract and transition it to REVIEW_REQUESTED
    const createRes = await request.post('/api/contracts', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: {
        airlineId: 'EK',
        airportCode: 'DXB',
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        currency: 'USD',
        services: [
          {
            chargeCode: 'BAGGAGE',
            serviceName: 'Baggage Sorting',
            formulaType: 'PF-01',
            quantityDriver: 'bags',
            uom: 'EA',
            taxCode: 'VAT-0',
            rateDetails: { rate: 25.0 },
          },
        ],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const contract = await createRes.json();

    // Transition: DRAFT -> PENDING_APPROVAL -> REVIEW_REQUESTED
    await request.put(`/api/contracts/${contract.id}/status`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: { status: 'PENDING_APPROVAL' },
    });

    await request.put(`/api/contracts/${contract.id}/status`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: { status: 'REVIEW_REQUESTED' },
    });

    // 2. Open Contracts List
    await page.goto('/');
    await page.click('text=Contracts');
    await expect(page).toHaveURL(/\/contracts/);

    // 3. Locate REVIEW_REQUESTED contract and click Edit
    const contractRow = page.locator(`tr:has-text("${contract.id.substring(0, 8)}")`);
    await expect(contractRow).toBeVisible();
    await expect(contractRow).toContainText('REVIEW REQUESTED');
    const editBtn = contractRow.locator('[data-testid="edit-contract-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // 4. Step through wizard and revise rate
    await expect(page).toHaveURL(new RegExp(`/contracts/${contract.id}/edit`));
    await page.click('#contract-wizard-next-btn');
    await page.fill('#services_0_rate', '22.00');
    await page.click('#contract-wizard-next-btn');
    await page.click('#contract-wizard-submit-btn');

    await expect(page).toHaveURL(/\/contracts/);
    await expect(page.locator('body')).toContainText('Contract updated successfully!');

    // 5. Re-submit for approval from the list
    const updatedRow = page.locator(`tr:has-text("${contract.id.substring(0, 8)}")`);
    const submitBtn = updatedRow.locator('[data-testid="submit-approval-btn"]');
    await submitBtn.click();
    await expect(page.locator('body')).toContainText('Contract status updated to PENDING_APPROVAL');

    // 6. Approve the contract
    const pendingRow = page.locator(`tr:has-text("${contract.id.substring(0, 8)}")`);
    const approveBtn = pendingRow.locator('[data-testid="approve-btn"]');
    await approveBtn.click();
    await expect(page.locator('body')).toContainText('Contract status updated to APPROVED');

    // 7. Verify that APPROVED contract no longer has an Edit button
    const approvedRow = page.locator(`tr:has-text("${contract.id.substring(0, 8)}")`);
    await expect(approvedRow).toContainText('APPROVED');
    await expect(approvedRow.locator('[data-testid="edit-contract-btn"]')).not.toBeVisible();
  });
});
