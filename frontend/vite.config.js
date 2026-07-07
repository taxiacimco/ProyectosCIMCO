// Versión Arquitectura: V9.8.6 - Optimización de WebSocket HMR y Enrutamiento de Proxy Unificado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Configuración maestra del servidor de Vite con soporte multi-entorno (Local, IP, Ngrok).
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
    host: '0.0.0.0', // Permite la escucha simultánea en Localhost y red externa
    historyApiFallback: true,
    allowedHosts: [
      '192.168.100.34',
      'localhost',
      '127.0.0.1',
      'globosely-appreciative-zander.ngrok-free.app',
      'globosely-appreciative-zander.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ],
    // 🛡️ TUNELIZACIÓN INTEGRADA: Enruta /api al backend Express local (Puerto 3000)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // 👈 CRÍTICO: Permite que los WebSockets de Socket.io también pasen por el proxy si es necesario
      },
    },
    watch: {
      usePolling: true,
    },
    // 🔥 OPTIMIZACIÓN HMR: Al remover 'host: localhost', Vite detecta dinámicamente 
    // si estás navegando desde Ngrok, IP local o localhost y adapta el WebSocket automáticamente.
    hmr: {
      protocol: 'ws'
    }
  }
});