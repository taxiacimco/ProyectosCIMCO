// Versión Arquitectura: V1.0 - Centralización de Formateadores de Geolocalización y Direcciones Estructuradas
/**
 * Ubicación: frontend/src/utils/formatters.js
 * Misión: Proveer funciones puras de normalización de payloads de localización para la UI de CIMCO.
 * Ajuste V1.0: Extracción de lógica duplicada con blindaje estricto contra propiedades nulas o indefinidas.
 */

/**
 * Normaliza y formatea un nodo de dirección o coordenadas para su correcta visualización en la interfaz.
 * @param {string|object} nodo - Fragmento de dirección de recogida/destino o coordenadas GPS.
 * @returns {string} Cadena de texto formateada y segura para renderizar.
 */
export const formatDireccion = (nodo) => {
    // Guarda de seguridad primaria
    if (!nodo) {
        return 'Ubicación no especificada';
    }

    // Retorno directo si es una cadena plana
    if (typeof nodo === 'string') {
        return nodo.trim() || 'Ubicación vacía';
    }
    
    // Evaluación exhaustiva si es un objeto estructurado (MongoDB GeoJSON o Firebase Map)
    if (typeof nodo === 'object') {
        // Comprobación de campos semánticos explícitos
        if (nodo.direccion || nodo.address || nodo.nombre) {
            return String(nodo.direccion || nodo.address || nodo.nombre).trim();
        }
        
        // Extracción con guardas para coordenadas puras o anidadas
        const lat = nodo.lat ?? nodo.latitude ?? nodo.coordenadas?.lat ?? nodo.coordenadas?.latitude;
        const lng = nodo.lng ?? nodo.longitude ?? nodo.coordenadas?.lng ?? nodo.coordenadas?.longitude;
        
        // Si contiene coordenadas numéricas válidas, se formatea con precisión decimal fija (4 dígitos)
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            return `Lat: ${parseFloat(lat).toFixed(4)}, Lng: ${parseFloat(lng).toFixed(4)}`;
        }
    }
    
    return 'Ubicación Estructurada';
};