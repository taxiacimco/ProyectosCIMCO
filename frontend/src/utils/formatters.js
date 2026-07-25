// Versión Arquitectura: V1.1 - Consolidación de Formateadores de Geolocalización, Monedas y Normalizaciones
/**
 * Ubicación: frontend/src/utils/formatters.js
 * Misión: Proveer funciones puras de normalización de payloads de localización, moneda y cadenas para la UI de CIMCO.
 * Ajuste V1.1: Inclusión del helper global de formateo de moneda colombiana (COP) para reutilización en dashboards de administración y billeteras.
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

/**
 * Formatea un valor numérico al estándar de moneda oficial de Colombia (COP).
 * @param {number|string} valor - Valor a formatear.
 * @returns {string} Cadena formateada en pesos colombianos (ej. $ 15.000).
 */
export const formatearMoneda = (valor = 0) => {
    const montoNumerico = Number(valor) || 0;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(montoNumerico);
};