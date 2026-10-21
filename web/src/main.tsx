import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/public.css';
import './styles/app.css';
import { AppRoutes } from './App';
import { RouterProvider } from './lib/router';
import { AuthProvider } from './lib/auth';
import { SiteProvider } from './lib/site';
import { ToastProvider } from './lib/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <ToastProvider>
        <AuthProvider>
          <SiteProvider>
            <AppRoutes />
          </SiteProvider>
        </AuthProvider>
      </ToastProvider>
    </RouterProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
