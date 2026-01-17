const CACHE_NAME = "panel-cimco-cache-v1";
const urlsToCache = [
  "/",
  "/panel-mantenimiento.html",
  "/manifest.json",
  "/assets/logo-taxiacimco.png",
  "/assets/favicon-cimco.png"
];

// Instalación (almacena los archivos esenciales)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => console.log("✅ Archivos cacheados correctamente"))
      .catch(err => console.error("❌ Error cacheando archivos:", err))
  );
});

// Activación (elimina cachés viejas)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("🗑 Eliminando caché antigua:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch (sirve los archivos desde caché cuando sea posible)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match("/panel-mantenimiento.html"))
  );
});
