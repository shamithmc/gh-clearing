import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthKitProvider } from '@workos-inc/authkit-react';
import App from './App.tsx';
import './index.css';
import { loadBrowserAuthConfig, WorkOsAuthenticationGate } from './auth/workosAuth.tsx';

const root = createRoot(document.getElementById('root')!);

const application = (
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>
);

const renderApplication = async () => {
  const config = await loadBrowserAuthConfig();
  root.render(config.enabled ? (
    <AuthKitProvider clientId={config.clientId} apiHostname={config.apiHostname}>
      <WorkOsAuthenticationGate>{application}</WorkOsAuthenticationGate>
    </AuthKitProvider>
  ) : application);
};

const renderAuthenticationError = (error: unknown) => root.render(
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <div className="max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-xl">
      <h1 className="text-xl font-bold m-0">Unable to sign in</h1>
      <p className="mt-3 text-sm text-slate-300">
        {error instanceof Error ? error.message : 'Authentication initialization failed.'}
      </p>
      <button
        className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </div>
  </div>,
);

void renderApplication().catch(renderAuthenticationError);
