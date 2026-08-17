import { getAuthenticatedUser, type AuthenticatedUser } from '../auth/workosAuth';

export const GROUND_HANDLER_ROLES = [
  'ADMIN',
  'GROUND_HANDLER_ADMIN',
  'CONTRACT_ENTRY',
  'CONTRACT_APPROVER',
  'INVOICE_ENTRY',
  'INVOICE_APPROVER',
  'STATUS_UPDATER',
  'MIS_VIEWER',
  'RFP_MONITOR',
  'DISPUTE_HANDLER',
  'DISPUTE_APPROVER',
] as const;

export const AIRLINE_OPERATIONAL_ROLES = [
  'INVOICE_REVIEWER',
  'INVOICE_DISPUTER',
  'CONTRACT_VIEWER',
  'CONTRACT_REVIEWER',
  'RFP_RAISER',
  'MIS_VIEWER',
  'PAYMENT_UPDATER',
] as const;

export const AIRLINE_ADMIN_ROLE = 'AIRLINE_ADMIN';
export const PLATFORM_ADMIN_ROLE = 'PLATFORM_ADMIN';

export const isPlatformAdmin = (
  user: AuthenticatedUser | null = getAuthenticatedUser(),
  simulatedTenantType: string | null = localStorage.getItem('simTenantType'),
): boolean => {
  if (user) {
    return user.tenantType === 'PLATFORM_ADMIN' || user.roles.includes(PLATFORM_ADMIN_ROLE);
  }
  return simulatedTenantType === 'PLATFORM_ADMIN';
};

export const canManageTenants = (
  user: AuthenticatedUser | null = getAuthenticatedUser(),
  simulatedTenantType: string | null = localStorage.getItem('simTenantType'),
): boolean => {
  return isPlatformAdmin(user, simulatedTenantType);
};

export const canManageUsers = (
  user: AuthenticatedUser | null = getAuthenticatedUser(),
  simulatedTenantType: string | null = localStorage.getItem('simTenantType'),
): boolean => {
  if (isPlatformAdmin(user, simulatedTenantType)) {
    return true;
  }
  if (user) {
    if (user.tenantType === 'GROUND_HANDLER') {
      return user.roles.some(role => role === 'ADMIN' || role === 'GROUND_HANDLER_ADMIN');
    }
    if (user.tenantType === 'AIRLINE') {
      return user.roles.includes('AIRLINE_ADMIN');
    }
    return false;
  }

  // Simulated fallback in dev / e2e
  const type = simulatedTenantType ?? 'GROUND_HANDLER';
  return type === 'GROUND_HANDLER' || type === 'AIRLINE' || type === 'PLATFORM_ADMIN';
};

export const getAllowedRolesForTenant = (
  tenantType: 'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN',
  callerIsPlatformAdmin: boolean,
): string[] => {
  switch (tenantType) {
    case 'GROUND_HANDLER':
      return [...GROUND_HANDLER_ROLES];
    case 'AIRLINE':
      return callerIsPlatformAdmin
        ? [AIRLINE_ADMIN_ROLE, ...AIRLINE_OPERATIONAL_ROLES]
        : [...AIRLINE_OPERATIONAL_ROLES];
    case 'PLATFORM_ADMIN':
      return [PLATFORM_ADMIN_ROLE];
    default:
      return [];
  }
};
