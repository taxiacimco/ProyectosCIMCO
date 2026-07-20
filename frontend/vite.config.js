// Versión Arquitectura: V9.9.5 - Corrección de Dependencias Circulares y Optimización de Chunks Limpios
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Eliminar la advertencia 'Circular chunk' reestructurando el empaquetado manual.
 * Previene que las dependencias implícitas de node_modules se mezclen de forma cíclica con el núcleo.
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
    host: '0.0.0.0', // Escucha activa para permitir conexiones desde el teléfono por IP
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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    watch: {
      usePolling: true,
    },
    hmr: {
      protocol: 'ws'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // Ajuste del umbral operacional para producción
    rollupOptions: {
      output: {
        // Corrección definitiva del ciclo: Evitamos clasificar arbitrariamente todo el node_modules
        manualChunks(id) {
          // Bloque exclusivo para el núcleo de la aplicación reactiva
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-core';
          }
          // Bloque aislado para la suite gráfica de iconos
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-ui-icons';
          }
          // Bloque para peticiones y transporte de red
          if (id.includes('node_modules/axios')) {
            return 'vendor-network';
          }
          // Infraestructura de datos
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
        },
      },
    },
  },
});