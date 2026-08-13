// Versión Arquitectura: V10.0 - Service Worker PWA Dinámico con Estrategia Network-First y Bypass Perimetral
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public\service-worker.js
 * Misión: Proveer almacenamiento en caché seguro con estrategia Network-First para assets estáticos, 
 *         soporte PWA offline, sincronización dinámica para tunnels y bypass estricto para APIs/Sockets/Firebase.
 */

const CACHE_NAME = "taxia-cimco-static-v4";

// Lista de recursos estáticos canónicos verificados en disco
const ASSETS_CANONICOS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/registerSW.js",
  "/assets/favicon-taxia-cimco.png",
  "/assets/pasajero-192.png",
  "/assets/pwa-icons/pwa-192x192.png",
  "/assets/pwa-icons/pwa-512x512.png"
];

// 1. INSTALACIÓN: Precarga atómica y skipWaiting para activar el nuevo worker inmediatamente
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_CANONICOS))
      .catch((err) => {
        console.error("[CIMCO-SW] Error en instalación y precarga de caché:", err);
      })
  );
});

// 2. ACTIVACIÓN: Purgado atómico de versiones obsoletas de caché y toma de control de clientes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[CIMCO-SW] Purgando caché obsoleta:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. FETCH: Estrategia Network-First para contenido web y Bypass Total para Backend/Sockets/Tunnels
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo procesar peticiones HTTP/HTTPS de método GET
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // BYPASS TOTAL: No cachear llamadas al backend, sockets, pasarelas de pago, Firebase ni dominios dinámicos de desarrollo
  const esLlamadaApi = 
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("railway.app") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("wompi.co") ||
    url.hostname.includes("socket.io") ||
    url.hostname.includes("trycloudflare.com");

  if (esLlamadaApi) {
    return; // Pasa directo a la red sin intervenir
  }

  // MANEJO DE NAVEGACIÓN SPA: Retornar index.html ante pérdida de red
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ESTRATEGIA NETWORK-FIRST (Red Primero -> Fallback a Caché)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});