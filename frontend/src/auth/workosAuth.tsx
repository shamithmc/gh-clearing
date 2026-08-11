import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@workos-inc/authkit-react';

export interface BrowserAuthConfig {
  enabled: boolean;
  apiHostname: string;
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

let authenticatedUser: AuthenticatedUser | null = null;
let accessTokenProvider: (() => Promise<string>) | null = null;
let signOutProvider: (() => void) | null = null;
let fetchInterceptorInstalled = false;
let axiosInterceptorInstalled = false;
let sessionInFlight: Promise<AuthenticatedUser> | null = null;

export const normalizeApiHostname = (value: string): string => {
  const candidate = value.includes('://') ? value : `https://${value}`;
  const url = new URL(candidate);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('WorkOS API hostname must not contain a path, query, or fragment');
  }
  return url.host;
};

export const loadBrowserAuthConfig = async (): Promise<BrowserAuthConfig> => {
  const response = await window.fetch('/api/auth/config', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Unable to load authentication configuration (${response.status})`);
  }
  const config = await response.json() as BrowserAuthConfig;
  if (config.enabled) {
    if (!config.clientId.startsWith('client_')) {
      throw new Error('WorkOS Client ID is not configured');
    }
    config.apiHostname = normalizeApiHostname(config.apiHostname);
  }
  return config;
};

const isSameOriginApiRequest = (input: RequestInfo | URL): boolean => {
  const rawUrl = input instanceof Request ? input.url : input.toString();
  const url = new URL(rawUrl, window.location.origin);
  return url.origin === window.location.origin && url.pathname.startsWith('/api/');
};

const validAccessToken = async (): Promise<string> => {
  if (!accessTokenProvider) {
    throw new Error('WorkOS authentication has not been initialized');
  }
  const token = await accessTokenProvider();
  if (!token) {
    throw new Error('WorkOS did not provide an access token');
  }
  return token;
};

const installAuthenticatedTransports = () => {
  if (!fetchInterceptorInstalled) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!accessTokenProvider || !isSameOriginApiRequest(input)) {
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
      if (accessTokenProvider && config.url) {
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

const establishApplicationSession = (): Promise<AuthenticatedUser> => {
  if (!sessionInFlight) {
    sessionInFlight = window.fetch('/api/auth/session', { method: 'POST' })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Unable to establish the application session (${response.status})`);
        }
        return response.json() as Promise<AuthenticatedUser>;
      })
      .finally(() => {
        sessionInFlight = null;
      });
  }
  return sessionInFlight;
};

export const WorkOsAuthenticationGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isLoading, user, signIn, signOut, getAccessToken } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      void signIn({ state: { returnTo: window.location.pathname } });
    }
  }, [isLoading, user, signIn]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    accessTokenProvider = getAccessToken;
    signOutProvider = () => signOut({ returnTo: window.location.origin });
    installAuthenticatedTransports();
    void establishApplicationSession()
      .then(session => {
        if (!active) return;
        authenticatedUser = session;
        persistTenantContext(session);
        setReady(true);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Authentication failed');
      });
    return () => {
      active = false;
    };
  }, [user, getAccessToken, signOut]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-xl font-bold m-0">Unable to sign in</h1>
          <p className="mt-3 text-sm text-slate-300">{error}</p>
          <button className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold"
            onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
  if (isLoading || !user || !ready) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Signing in…</div>;
  }
  return <>{children}</>;
};

export const isWorkOsAuthenticated = (): boolean => authenticatedUser !== null;
export const getAuthenticatedUser = (): AuthenticatedUser | null => authenticatedUser;

export const logout = async (): Promise<void> => {
  authenticatedUser = null;
  accessTokenProvider = null;
  localStorage.removeItem('simTenantId');
  localStorage.removeItem('simTenantType');
  localStorage.removeItem('simUserId');
  if (signOutProvider) {
    signOutProvider();
  } else {
    window.location.reload();
  }
};
