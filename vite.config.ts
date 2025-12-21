import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },

    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            // React core - rarely changes
            'vendor-react': ['react', 'react-dom'],
            // Charts library - large, rarely changes
            'vendor-charts': ['recharts'],
            // Animation library - large
            'vendor-motion': ['framer-motion'],
            // Map libraries - large, rarely changes
            'vendor-maps': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
            // Utility libraries - small, stable
            'vendor-utils': ['zod', 'zustand', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            // Icons - tree-shaken, but good to separate
            'vendor-icons': ['lucide-react'],
          }
        }
      },
      // Increase chunk size warning limit slightly to account for recharts
      chunkSizeWarningLimit: 600,
    }
  };
});
