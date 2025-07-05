import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load .env file. The README specifies using API_KEY.
    const env = loadEnv(mode, '.', '');
    
    return {
      base: '/japanese-reader/',
      define: {
        // In test mode, we explicitly set the default API key to an empty string (""),
        // which is a falsy value. This ensures that tests for the "API key missing" 
        // scenario are predictable and independent of any local .env files.
        // Other tests that require a key can provide one via the SettingsContext mock.
        'process.env.API_KEY': mode === 'test' 
            ? JSON.stringify('')
            : JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
      },    
    };
});
