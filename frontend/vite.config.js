// Versión Arquitectura: V9.2 - Integración de IP Local en Lista Blanca de Seguridad
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Autorizar el acceso desde la red local (192.168.100.34) para despliegue móvil.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Permite que la aplicación SPA maneje rutas externas
    historyApiFallback: true,
    
    // 🌐 Apertura de Red: Lista blanca de hosts autorizados para el túnel y la red local
    allowedHosts: [
      '192.168.100.34', // ⬅️ AGREGADO: IP de tu PC en la red local
      'globosely-appreciative-zander.ngrok-free.app',
      'globosely-appreciative-zander.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok-free.dev'
    ]
  }
})