// Versión Arquitectura: V10.4.0 - Resolución de alias (@) y orquestación SPA optimizada para despliegue en Vercel
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Orquestación de empaquetado Vite, resolución de alias de rutas (@), 
 *         configuración de HMR para túneles y proxy server para redirección de peticiones /api y /socket.io sin fallos SSL.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Escucha en todas las interfaces de red locales
    historyApiFallback: true,
    allowedHosts: [
      '192.168.100.34',
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ],
    proxy: {
      // Redirección de llamadas REST API hacia el backend local sin advertencias SSL
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Redirección del canal WebSocket de Socket.IO hacia el backend local sin advertencias SSL
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    watch: {
      usePolling: true,
    },
    // Configuración HMR forzada a WebSocket Seguro (WSS) para compatibilidad con el túnel HTTPS de Cloudflare
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-core';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui-icons';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-network';
          }
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
        },
      },
    },
  },
});