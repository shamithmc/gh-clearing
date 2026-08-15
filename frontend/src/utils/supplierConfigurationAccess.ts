import { getAuthenticatedUser, type AuthenticatedUser } from '../auth/workosAuth';

const CONFIGURATION_ADMIN_ROLES = new Set(['ADMIN', 'GROUND_HANDLER_ADMIN']);

export const canManageSupplierConfiguration = (
  user: AuthenticatedUser | null = getAuthenticatedUser(),
  simulatedTenantType: string | null = localStorage.getItem('simTenantType'),
): boolean => {
  if (user) {
    return user.tenantType === 'GROUND_HANDLER'
      && user.roles.some(role => CONFIGURATION_ADMIN_ROLES.has(role));
  }

  // The dev/e2e authentication profile assigns ADMIN to ground-handler personas.
  return (simulatedTenantType ?? 'GROUND_HANDLER') === 'GROUND_HANDLER';
};
