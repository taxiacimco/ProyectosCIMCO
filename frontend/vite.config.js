// Versión Arquitectura: V9.6.0 - Blindaje HMR Polling, Alias Absoluto y Estabilización Tailwind v4
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Integrar el compilador nativo de Tailwind CSS v4, preservar proxies y estabilizar el sistema de archivos (HMR) en Windows mediante usePolling y Alias absolutos.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path'; // 🚀 Fusión Atómica: Inyección de módulo de rutas para Alias

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 🚀 Fusión Atómica: Plugin nativo oficial de Tailwind v4 para Vite
  ],
  resolve: {
    alias: {
      // 🛡️ Blindaje de Enrutamiento: Sella la ruta base eliminando las dependencias relativas frágiles (../../) y evita recargos por salidas del File System (/@fs/)
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // Puerto nativo del ecosistema frontend verificado
    host: '0.0.0.0', // Escucha en todas las interfaces para acceso móvil y red local
    historyApiFallback: true, // Evita el error 404 al recargar páginas como /login o /admin/dashboard
    allowedHosts: [
      '192.168.100.34',
      'globosely-appreciative-zander.ngrok-free.app',
      'globosely-appreciative-zander.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ],
    // 🛡️ Blindaje HMR: Fuerza a Vite a escanear archivos constantemente en Windows (PowerShell/WSL)
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: true,
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [
      '192.168.100.34',
      'globosely-appreciative-zander.ngrok-free.app',
      'globosely-appreciative-zander.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ]
  }
});