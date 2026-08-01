import axios from 'axios';
import Keycloak from 'keycloak-js';

interface BrowserAuthConfig {
  enabled: boolean;
  issuerUri: string;
  clientId: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  tenantType: 'GROUND_HANDLER' | 'AIRLINE' | 'PLATFORM_ADMIN';
  username: string;
  email: string;
  roles: string[];
}

let keycloak: Keycloak | null = null;
let authenticatedUser: AuthenticatedUser | null = null;
let fetchInterceptorInstalled = false;
let axiosInterceptorInstalled = false;
let refreshInFlight: Promise<boolean> | null = null;

export const keycloakConfigFromIssuer = (issuerUri: string, clientId: string) => {
  const issuer = new URL(issuerUri);
  const realmMarker = '/realms/';
  const realmIndex = issuer.pathname.indexOf(realmMarker);
  if (realmIndex < 0) {
    throw new Error('Keycloak issuer URI must contain /realms/{realm}');
  }

  const realm = decodeURIComponent(issuer.pathname.substring(realmIndex + realmMarker.length));
  if (!realm || realm.includes('/')) {
    throw new Error('Keycloak issuer URI must identify exactly one realm');
  }

  const basePath = issuer.pathname.substring(0, realmIndex).replace(/\/$/, '');
  return {
    url: `${issuer.origin}${basePath}`,
    realm,
    clientId,
  };
};

const isSameOriginApiRequest = (input: RequestInfo | URL): boolean => {
  const rawUrl = input instanceof Request ? input.url : input.toString();
  const url = new URL(rawUrl, window.location.origin);
  return url.origin === window.location.origin && url.pathname.startsWith('/api/');
};

const validAccessToken = async (): Promise<string> => {
  if (!keycloak) {
    throw new Error('Keycloak authentication has not been initialized');
  }
  if (!refreshInFlight) {
    refreshInFlight = keycloak.updateToken(30).finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
  if (!keycloak.token) {
    throw new Error('Keycloak did not provide an access token');
  }
  return keycloak.token;
};

const installAuthenticatedTransports = () => {
  if (!fetchInterceptorInstalled) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!keycloak || !isSameOriginApiRequest(input)) {
        return originalFetch(input, init);
      }

      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
      headers.set('Authorization', `Bearer ${await validAccessToken()}`);
      return originalFetch(input, { ...init, headers });
    };
    fetchInterceptorInstalled = true;
  }

  if (!axiosInterceptorInstalled) {
    axios.interceptors.request.use(async config => {
      if (keycloak && config.url) {
        const url = new URL(config.url, window.location.origin);
        if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
          config.headers.set('Authorization', `Bearer ${await validAccessToken()}`);
        }
      }
      return config;
    });
    axiosInterceptorInstalled = true;
  }
};

const persistTenantContext = (user: AuthenticatedUser) => {
  localStorage.setItem('simTenantId', user.tenantId);
  localStorage.setItem('simTenantType', user.tenantType);
  localStorage.setItem('simUserId', user.id);
};

export const initializeAuthentication = async (): Promise<void> => {
  const configResponse = await window.fetch('/api/auth/config', { credentials: 'same-origin' });
  if (!configResponse.ok) {
    throw new Error(`Unable to load authentication configuration (${configResponse.status})`);
  }
  const config = await configResponse.json() as BrowserAuthConfig;
  if (!config.enabled) {
    return;
  }

  keycloak = new Keycloak(keycloakConfigFromIssuer(config.issuerUri, config.clientId));
  const authenticated = await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });
  if (!authenticated) {
    await keycloak.login({ redirectUri: window.location.href });
    return;
  }

  installAuthenticatedTransports();
  const sessionResponse = await window.fetch('/api/auth/session', { method: 'POST' });
  if (!sessionResponse.ok) {
    throw new Error(`Unable to establish the application session (${sessionResponse.status})`);
  }
  authenticatedUser = await sessionResponse.json() as AuthenticatedUser;
  persistTenantContext(authenticatedUser);

  keycloak.onTokenExpired = () => {
    void validAccessToken().catch(() => keycloak?.login({ redirectUri: window.location.href }));
  };
};

export const isKeycloakAuthenticated = (): boolean => keycloak?.authenticated === true;

export const getAuthenticatedUser = (): AuthenticatedUser | null => authenticatedUser;

export const logout = async (): Promise<void> => {
  if (keycloak) {
    await keycloak.logout({ redirectUri: window.location.origin });
    return;
  }
  localStorage.removeItem('simTenantId');
  localStorage.removeItem('simTenantType');
  localStorage.removeItem('simUserId');
  window.location.reload();
};
