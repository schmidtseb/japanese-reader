
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const isProduction = mode === 'production';

    return {
      base: './',
      build: {
        rollupOptions: {
          // Use index.prod.html as the entry point for production builds
          input: isProduction ? resolve(__dirname, 'index.prod.html') : undefined,
        },
      },
      define: {
        'process.env.API_KEY': mode === 'test' 
            ? JSON.stringify('')
            : JSON.stringify(env.API_KEY),
      },
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
      },    
    };
});