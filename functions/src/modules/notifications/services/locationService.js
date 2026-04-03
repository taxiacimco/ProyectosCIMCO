// functions/src/modules/notifications/services/locationService.js

/**
 * Calcula la distancia entre dos coordenadas geográficas en kilómetros (Fórmula Haversine).
 */
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Filtra un array de conductores y devuelve solo los que están dentro de un radio específico.
 */
export const filtrarConductoresPorCercania = (conductores, usuarioLat, usuarioLng, radioKm = 5) => {
  return conductores.filter(conductor => {
    // Si el conductor no tiene ubicación reportada, se ignora
    if (!conductor.ubicacion || !conductor.ubicacion.latitude) return false;
    
    const distancia = calcularDistancia(
      usuarioLat, 
      usuarioLng, 
      conductor.ubicacion.latitude, 
      conductor.ubicacion.longitude
    );
    
    return distancia <= radioKm;
  });
};