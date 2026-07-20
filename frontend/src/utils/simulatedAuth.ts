export const unrestrictedUserId = (tenantId: string) => `dev-${tenantId}`;
export const scopedUserId = (tenantId: string) => `dev-${tenantId}-scoped`;

export const getSimulatedUserId = (tenantId: string): string => {
  const stored = localStorage.getItem('simUserId');
  const validUsers = [unrestrictedUserId(tenantId), scopedUserId(tenantId)];
  return stored && validUsers.includes(stored) ? stored : unrestrictedUserId(tenantId);
};

export const setSimulatedUserId = (userId: string): void => {
  localStorage.setItem('simUserId', userId);
};

export const simulatedAuthHeaders = (
  tenantId: string,
  tenantType: string,
  userId = getSimulatedUserId(tenantId)
): Record<string, string> => ({
  'X-Mock-Tenant-Id': tenantId,
  'X-Mock-Tenant-Type': tenantType,
  'X-Mock-User-Id': userId,
});
