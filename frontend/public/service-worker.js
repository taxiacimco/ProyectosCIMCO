// Versión Arquitectura: V8.2 - Sincronización de Caché con Nueva Estructura Assets
const CACHE_NAME = "taxia-cimco-frontend-v2";

// Archivos esenciales actualizados a la nueva estructura de assets
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest-pasajero.webmanifest",
  "/css/style.css",
  "/assets/pwa-icons/pwa-192x192.png",
  "/assets/pwa-icons/pwa-512x512.png",
  "/assets/favicon-cimco.png"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación (elimina versiones antiguas de caché)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta las peticiones y sirve desde caché si no hay conexión
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match("/index.html")))
  );
});