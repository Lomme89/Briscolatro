import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SpritesheetProvider } from './components/PixelCardSprite.tsx';
import './index.css';

// Register PWA Service Worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || './';
    const swUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}sw.js`;
    navigator.serviceWorker.register(swUrl, { scope: baseUrl }).catch((err) => {
      console.warn('SW registration skipped:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpritesheetProvider>
      <App />
    </SpritesheetProvider>
  </StrictMode>,
);
