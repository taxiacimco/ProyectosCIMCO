// Versión Arquitectura: V1.3 - Registro de Service Worker PWA con Auto-Update Robusto y Control de Ciclo de Vida
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public\registerSW.js
 * Misión: Registrar el Service Worker con alcance raíz ('/'), forzar la comprobación de actualizaciones de versión 
 *         y recargar automáticamente el cliente al detectar un nuevo worker instalado para evitar clientes desactualizados.
 */

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        if (registration) {
          console.log('[CIMCO PWA] Service Worker registrado con éxito. Scope:', registration.scope);

          // Forzar verificación de nueva versión contra el servidor
          registration.update().catch((err) => {
            console.warn('[CIMCO PWA] Error comprobando actualización del Service Worker:', err);
          });

          // Detectar la instalación de nuevos trabajadores
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[CIMCO PWA] Nueva versión detectada. Actualizando sistema...');
                    window.location.reload();
                  } else {
                    console.log('[CIMCO PWA] Contenido almacenado en caché para uso offline.');
                  }
                }
              };
            }
          };
        }
      })
      .catch((error) => {
        console.error('[CIMCO PWA] Error al registrar el Service Worker:', error);
      });
  });
}