/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createRoot } from 'react-dom/client';
import { 
    AppDataProvider, 
    SettingsProvider, 
    UIProvider, 
} from './src/contexts/index.ts';
import { ModalProvider } from './src/components/Modal.tsx';
import App from './src/App.tsx';

function Main() {
  return (
    <SettingsProvider>
      <UIProvider>
        <AppDataProvider>
          <ModalProvider>
            <App />
          </ModalProvider>
        </AppDataProvider>
      </UIProvider>
    </SettingsProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Main />);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.warn('ServiceWorker registration failed: ', err.message);
      });
  });
}
