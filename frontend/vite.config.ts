import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - loaded first, cached separately
          'vendor-react': ['react', 'react-dom'],
          // React Router - separate chunk for routing
          'vendor-router': ['react-router'],
          // UI library dependencies
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            '@radix-ui/react-progress',
            '@radix-ui/react-alert-dialog',
          ],
          // Icons - large but cacheable
          'vendor-icons': ['lucide-react'],
          // Date/utilities
          'vendor-utils': ['date-fns', 'clsx', 'class-variance-authority'],
          // State management
          'vendor-state': ['zustand'],
        },
      },
    },
  },
});
