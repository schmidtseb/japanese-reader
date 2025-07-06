
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const config = {
      base: './',
      define: {
        'process.env.API_KEY': mode === 'test' 
            ? JSON.stringify('')
            : JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
            // Aliasing is no longer needed for App.tsx
        },
      },
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
      },    
    };

    return config;
});