const CACHE_NAME = "taxia-cimco-frontend-v1";

// Archivos esenciales
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/img/favicon-cimco.png",
  "/js/firebase-config.js"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación (elimina versiones antiguas)
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
