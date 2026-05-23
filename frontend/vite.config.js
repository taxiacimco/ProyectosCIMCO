// Versión Arquitectura: V9.1 - Integración Quirúrgica de Túnel Ngrok para Despliegue en Campo
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\vite.config.js
 * Misión: Habilitar la conexión de dispositivos móviles externos mediante el túnel de Ngrok,
 * resolviendo el error de seguridad "Blocked host" de Vite y manteniendo la integridad
 * del enrutamiento de la aplicación (SPA).
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 🛡️ Mantenido: Garantiza que React Router gestione las rutas correctamente en el servidor de desarrollo
    // Evita errores 404 al recargar páginas que no sean el index (como /pasajero o /mototaxi)
    historyApiFallback: true,

    // 🌐 Apertura de Túnel: Permite que dispositivos externos accedan a la PC Central a través de Ngrok
    allowedHosts: [
      'globosely-appreciative-zander.ngrok-free.app', // Dominio actual detectado
      'globosely-appreciative-zander.ngrok-free.dev', // Variante de dominio según región
      '.ngrok-free.app',                              // Comodín para cualquier túnel de Ngrok (Resiliencia)
      '.ngrok-free.dev'                               // Comodín para variantes .dev
    ]
  }
})