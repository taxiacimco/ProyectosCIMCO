// env.loader.js
// Pequeño manager para elegir modo (production | piloto | local).
// Puedes adaptarlo para cargar distintos firebaseConfig si lo necesitas.

export const MODE = (() => {
  // Cambia a "production" cuando subas a hosting final
  return "production";
})();

export const isProduction = () => MODE === "production";
