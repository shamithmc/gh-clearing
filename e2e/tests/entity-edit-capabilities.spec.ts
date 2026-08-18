import { test, expect } from '@playwright/test';

test.describe('Extended Entity Edit Capabilities E2E', () => {

  test.beforeEach(async ({ request }) => {
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

  test('Supplier can edit a published Service Offering description and capabilities', async ({ page, request }) => {
    // 1. Ensure at least one service offering exists for SWISSPORT at DXB
    let offeringId = '';
    const listRes = await request.get('/api/supplier/offerings', {
      headers: {
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
    });
    const offerings = listRes.ok() ? await listRes.json() : [];

    if (offerings.length > 0) {
      offeringId = offerings[0].id;
    } else {
      const createRes = await request.post('/api/supplier/offerings', {
        headers: {
          'Content-Type': 'application/json',
          'X-Mock-Tenant-Id': 'SWISSPORT',
          'X-Mock-Tenant-Type': 'GROUND_HANDLER',
          'X-Mock-User-Id': 'dev-SWISSPORT',
        },
        data: {
          airportCode: 'DXB',
          serviceType: 'RAMP_HANDLING',
          description: 'Initial Ramp Handling service description',
        },
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      offeringId = created.id;
    }

    // 2. Navigate to Service Offerings page as Supplier
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

    await page.goto('/offerings');
    await expect(page.getByRole('heading', { name: 'Service Offerings' })).toBeVisible();

    // 3. Click Edit on the offering
    const editBtn = page.getByTestId(`edit-offering-${offeringId}`);
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // 4. Update description and submit modal
    await expect(page.getByText('Edit Service Offering')).toBeVisible();
    await page.getByTestId('offering-description').fill('Updated 24/7 Automated Handling Hub with RFID Tracking');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 5. Verify success toast and table update
    await expect(page.locator('body')).toContainText('Service offering updated');
    await expect(page.getByText('Updated 24/7 Automated Handling Hub with RFID Tracking')).toBeVisible();
  });

  test('Platform Admin can edit Tenant Organization name and status', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'PLATFORM');
      localStorage.setItem('simTenantType', 'PLATFORM_ADMIN');
      localStorage.setItem('simUserId', 'dev-PLATFORM');
    });

    await page.goto('/admin/tenants');
    await expect(page.getByTestId('tenant-management-page')).toBeVisible();

    // Filter to SWISSPORT
    await page.locator('input[placeholder*="Search"]').fill('SWISSPORT');

    const editBtn = page.getByTestId('edit-tenant-SWISSPORT');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    await expect(page.getByText(/Edit Tenant Organization/)).toBeVisible();
    await page.getByTestId('edit-tenant-name-input').fill('Swissport Aviation Holdings');
    await page.getByTestId('submit-edit-tenant-button').click();

    await expect(page.getByText(/updated successfully/)).toBeVisible();
    await expect(page.getByText('Swissport Aviation Holdings')).toBeVisible();
  });

  test('Airline can edit published RFP and Ground Handler can edit submitted Proposal', async ({ browser, request }) => {
    // 1. Seed RFP via Airline API
    const rfpRes = await request.post('/api/rfps', {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'EK',
        'X-Mock-Tenant-Type': 'AIRLINE',
        'X-Mock-User-Id': 'dev-EK',
      },
      data: {
        airportCode: 'DXB',
        serviceType: 'BAGGAGE',
        desiredStartDate: '2026-09-01',
        desiredEndDate: '2027-09-01',
        requirements: 'Initial baggage turnaround specifications',
      },
    });
    expect(rfpRes.ok()).toBeTruthy();
    const rfp = await rfpRes.json();

    // 2. Airline context: navigates to /airline/rfps and edits the RFP
    const airlineContext = await browser.newContext();
    const airlinePage = await airlineContext.newPage();
    await airlinePage.addInitScript(() => {
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
      localStorage.setItem('simUserId', 'dev-EK');
    });

    await airlinePage.goto('/airline/rfps');
    await expect(airlinePage.getByRole('heading', { name: 'Requests for Proposal' })).toBeVisible();

    const editRfpBtn = airlinePage.getByTestId(`edit-rfp-${rfp.id}`);
    await expect(editRfpBtn).toBeVisible({ timeout: 10000 });
    await editRfpBtn.click();

    await expect(airlinePage.getByText('Edit RFP')).toBeVisible();
    await airlinePage.getByTestId('rfp-requirements').fill('Revised high-frequency peak baggage handling operations');
    await airlinePage.getByTestId('publish-rfp').click();

    await expect(airlinePage.getByText('RFP updated successfully')).toBeVisible();

    // Expand row to verify requirement text
    await airlinePage.locator('.ant-table-row-expand-icon').first().click();
    await expect(airlinePage.getByText('Revised high-frequency peak baggage handling operations')).toBeVisible();
    await airlineContext.close();

    // 3. Ground Handler submits proposal via API
    const propRes = await request.post(`/api/supplier/rfps/${rfp.id}/proposals`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Tenant-Id': 'SWISSPORT',
        'X-Mock-Tenant-Type': 'GROUND_HANDLER',
        'X-Mock-User-Id': 'dev-SWISSPORT',
      },
      data: {
        proposedRate: 350.00,
        currency: 'USD',
        terms: 'Standard baggage service SLA terms',
      },
    });
    expect(propRes.ok()).toBeTruthy();

    // 4. Ground Handler context: navigates to /rfps and edits proposal bid
    const ghContext = await browser.newContext();
    const ghPage = await ghContext.newPage();
    await ghPage.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

    await ghPage.goto('/rfps');
    await expect(ghPage.getByRole('heading', { name: 'RFP Summary' })).toBeVisible();

    const editBidBtn = ghPage.getByTestId(`edit-proposal-${rfp.id}`);
    await expect(editBidBtn).toBeVisible({ timeout: 10000 });
    await editBidBtn.click();

    await expect(ghPage.getByText(`Revise Bid for EK · BAGGAGE`)).toBeVisible();
    await ghPage.getByTestId('proposal-rate').fill('325.50');
    await ghPage.getByTestId('proposal-terms').fill('Revised competitive bid rate with volume tiered pricing');
    await ghPage.getByRole('button', { name: 'Save Changes' }).click();

    await expect(ghPage.getByText('Proposal updated successfully')).toBeVisible();
    await expect(ghPage.getByText('USD 325.5')).toBeVisible();
    await ghContext.close();
  });

});
