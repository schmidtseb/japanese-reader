


import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const isProduction = mode === 'production';

    return {
      base: './',
      build: {
        rollupOptions: {
          // Use index.prod.html as the entry point for production builds
          input: isProduction ? 'index.prod.html' : undefined,
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ''),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || ''),
      },
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
      },    
    };
});