// Versión Arquitectura: V1.0 - Inicializador Clean Code para Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registra el Service Worker de caché estática
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('[CIMCO PWA] ServiceWorker registrado con éxito. Scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[CIMCO PWA] Error al registrar ServiceWorker:', error);
      });
  });
}