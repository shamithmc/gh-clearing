import { expect, test } from '@playwright/test';

test.describe('Administration & Configuration Workflows', () => {
  test('platform admin provisions new tenant and user', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-4);
    const newTenantCode = `TA${timestamp}`;
    const newTenantName = `Test Airline ${timestamp}`;

    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'PLATFORM');
      localStorage.setItem('simTenantType', 'PLATFORM_ADMIN');
      localStorage.setItem('simUserId', 'dev-PLATFORM');
    });

    // 1. Tenant Administration
    await page.goto('/admin/tenants');
    await expect(page.getByRole('heading', { name: 'Tenant Management' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Tenants' })).toBeVisible();

    await page.getByTestId('add-tenant-button').click();
    await expect(page.getByText('Provision New Tenant')).toBeVisible();

    await page.getByTestId('new-tenant-id-input').fill(newTenantCode);
    await page.getByTestId('new-tenant-name-input').fill(newTenantName);

    const createTenantResponse = page.waitForResponse(
      response =>
        response.url().endsWith('/api/tenants') && response.request().method() === 'POST',
    );
    await page.getByTestId('submit-new-tenant-button').click();
    expect((await createTenantResponse).status()).toBe(201);

    await expect(page.getByText(`Tenant "${newTenantName}" (${newTenantCode}) created successfully.`)).toBeVisible();
    await page.getByTestId('tenant-search-input').fill(newTenantCode);
    await expect(page.getByRole('row').filter({ hasText: newTenantCode })).toBeVisible();

    // 2. User Administration as Platform Admin
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User & Role Administration' })).toBeVisible();

    // Switch active tenant in Platform Admin Selector using search
    const tenantSelector = page.getByTestId('admin-tenant-selector');
    await tenantSelector.click();
    await tenantSelector.getByRole('combobox').fill(newTenantCode);
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: newTenantCode })
      .first()
      .click();

    // Provision user for new tenant
    await page.getByTestId('provision-user-button').click();
    await expect(page.getByText(new RegExp(`Provision User — ${newTenantCode}`))).toBeVisible();

    const newUserId = `admin-${timestamp}`;
    await page.getByTestId('new-user-id-input').fill(newUserId);
    await page.getByTestId('new-user-name-input').fill(`Admin ${timestamp}`);
    await page.getByTestId('new-user-email-input').fill(`admin.${timestamp}@testairline.test`);

    // Pick role
    const rolesSelect = page.getByTestId('new-user-roles-select');
    await rolesSelect.click();
    await rolesSelect.getByRole('combobox').fill('AIRLINE_ADMIN');
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: 'AIRLINE_ADMIN' })
      .first()
      .click();

    const createUserResponse = page.waitForResponse(
      response =>
        response.url().includes(`/api/tenants/${newTenantCode}/users`) &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('submit-new-user-button').click();
    expect((await createUserResponse).status()).toBe(201);

    await expect(page.getByText(new RegExp(`User "Admin ${timestamp}" \\(${newUserId}\\) provisioned successfully`))).toBeVisible();
    await expect(page.getByRole('cell', { name: `Admin ${timestamp}`, exact: false })).toBeVisible();
  });

  test('ground handler admin provisions and edits user with ABAC dimensional restrictions', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-4);
    const userId = `op-${timestamp}`;
    const userName = `Operator ${timestamp}`;

    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User & Role Administration' })).toBeVisible();

    await page.getByTestId('provision-user-button').click();
    await expect(page.getByText(/Provision User — SWISSPORT/)).toBeVisible();

    await page.getByTestId('new-user-id-input').fill(userId);
    await page.getByTestId('new-user-name-input').fill(userName);
    await page.getByTestId('new-user-email-input').fill(`op.${timestamp}@swissport.test`);

    // Assign Role
    const rolesSelect = page.getByTestId('new-user-roles-select');
    await rolesSelect.click();
    await rolesSelect.getByRole('combobox').fill('CONTRACT_ENTRY');
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: 'CONTRACT_ENTRY' })
      .first()
      .click();

    // Dimensional restrictions: Airport DXB
    const airportsSelect = page.getByTestId('new-user-airports-select');
    await airportsSelect.click();
    await airportsSelect.getByRole('combobox').fill('DXB');
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: 'DXB' })
      .first()
      .click();

    // Dimensional restrictions: Charge Code BAGGAGE
    const chargeCodesSelect = page.getByTestId('new-user-chargecodes-select');
    await chargeCodesSelect.click();
    await chargeCodesSelect.getByRole('combobox').fill('BAGGAGE');
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: 'BAGGAGE' })
      .first()
      .click();

    const createResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/tenants/SWISSPORT/users') &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('submit-new-user-button').click();
    expect((await createResponse).status()).toBe(201);

    await expect(page.getByText(new RegExp(`User "${userName}" \\(${userId}\\) provisioned successfully`))).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: userId })).toBeVisible();

    // Edit user
    await page.getByTestId(`edit-user-${userId}`).click();
    await expect(page.getByText(`Edit User: ${userId}`)).toBeVisible();

    const updatedName = `Senior Operator ${timestamp}`;
    await page.getByTestId('edit-user-name-input').fill(updatedName);

    const updateResponse = page.waitForResponse(
      response =>
        response.url().includes(`/api/tenants/SWISSPORT/users/${userId}`) &&
        response.request().method() === 'PUT',
    );
    await page.getByTestId('submit-edit-user-button').click();
    expect((await updateResponse).status()).toBe(200);

    await expect(page.getByText(`User "${updatedName}" updated successfully.`)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: updatedName })).toBeVisible();
  });

  test('airline admin manages users within own tenant scope', async ({ page }) => {
    const timestamp = Date.now().toString().slice(-4);
    const userId = `ek-rev-${timestamp}`;
    const userName = `EK Reviewer ${timestamp}`;

    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
      localStorage.setItem('simUserId', 'dev-EK');
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User & Role Administration' })).toBeVisible();

    // Verify platform admin tenant switcher is NOT present for airline admin
    await expect(page.getByTestId('admin-tenant-selector')).toHaveCount(0);

    // Provision user for EK
    await page.getByTestId('provision-user-button').click();
    await expect(page.getByText(/Provision User — EK/)).toBeVisible();

    await page.getByTestId('new-user-id-input').fill(userId);
    await page.getByTestId('new-user-name-input').fill(userName);
    await page.getByTestId('new-user-email-input').fill(`reviewer.${timestamp}@emirates.test`);

    // Assign Role
    const rolesSelect = page.getByTestId('new-user-roles-select');
    await rolesSelect.click();
    await rolesSelect.getByRole('combobox').fill('INVOICE_REVIEWER');
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: 'INVOICE_REVIEWER' })
      .first()
      .click();

    // Verify implicit airline scope notice is displayed
    await expect(page.getByText('Implicit Airline Scope')).toBeVisible();

    const createResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/tenants/EK/users') &&
        response.request().method() === 'POST',
    );
    await page.getByTestId('submit-new-user-button').click();
    expect((await createResponse).status()).toBe(201);

    await expect(page.getByText(new RegExp(`User "${userName}" \\(${userId}\\) provisioned successfully`))).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: userId })).toBeVisible();
  });

  test('non-platform personas cannot access tenant management page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'SWISSPORT');
      localStorage.setItem('simTenantType', 'GROUND_HANDLER');
      localStorage.setItem('simUserId', 'dev-SWISSPORT');
    });

    await page.goto('/admin/tenants');
    await expect(page.getByText('Tenant administration access denied')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Tenants' })).toHaveCount(0);

    // Switch to Airline
    await page.addInitScript(() => {
      localStorage.setItem('simTenantId', 'EK');
      localStorage.setItem('simTenantType', 'AIRLINE');
      localStorage.setItem('simUserId', 'dev-EK');
    });

    await page.goto('/admin/tenants');
    await expect(page.getByText('Tenant administration access denied')).toBeVisible();
  });
});
