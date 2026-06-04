// Versión Arquitectura: V9.4 - Blindaje de Enrutamiento SPA y Estabilización de Red Local con Fallback
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Autorizar el acceso desde la red local, configurar proxies y asegurar el fallback de navegación SPA ante recargas de rutas internas.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Escucha en todas las interfaces para acceso móvil en La Jagua de Ibirico
    historyApiFallback: true, // 🚀 Fusión Atómica: Evita el error 404 al recargar páginas como /login o /admin/tesoreria
    allowedHosts: [
      '192.168.100.34',
      'globosely-appreciative-zander.ngrok-free.app',
      'globosely-appreciative-zander.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ]
  },
  preview: {
    port: 5173,
    // El despliegue de producción o preview necesita este handler y soporte SPA
    historyApiFallback: true,
    proxy: {} 
  }
})