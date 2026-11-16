import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Clean up any legacy caches from earlier deployments on the same origin
if (typeof window !== 'undefined' && 'caches' in window) {
  caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ledgerly-'))
          .map((key) => caches.delete(key))
      )
    )
    .catch(() => undefined);
}

// Register offline-capable PWA Service Worker and check for updates immediately
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    registration?.update().catch(() => undefined);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
