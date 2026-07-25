// Versión Arquitectura: V1.0 - Helper Centralizado de Resolución Cronológica Heterogénea NoSQL
/**
 * Ubicación: frontend\src\utils\dateUtils.js
 * Misión: Normalizar y deserializar cualquier tipo de representación cronológica (Firestore Timestamp, POJO, ISO string, ms) 
 * convirtiéndola en un objeto Date de JS válido para ser procesado por formatFechaColombia.
 */

/**
 * Desempaqueta de forma segura cualquier tipo de formato de fecha o Timestamp de Firestore/MongoDB.
 * @param {Object|Date|string|number} campoFecha - Estampa temporal heterogénea a procesar.
 * @returns {Date|null} Objeto Date nativo o null si la entrada es nula o ilegible.
 */
export const resolverFechaSegura = (campoFecha) => {
    if (!campoFecha) return null;

    try {
        // 1. Instancia nativa de Date
        if (campoFecha instanceof Date) {
            return isNaN(campoFecha.getTime()) ? null : campoFecha;
        }

        // 2. Timestamp nativo de Firestore con método .toDate()
        if (typeof campoFecha === 'object' && typeof campoFecha.toDate === 'function') {
            const d = campoFecha.toDate();
            return isNaN(d.getTime()) ? null : d;
        }

        // 3. Objeto POJO serializado o payload tipo { seconds, nanoseconds } (deserialización de Firebase)
        if (typeof campoFecha === 'object' && campoFecha?.seconds !== undefined) {
            const ms = Number(campoFecha.seconds) * 1000 + Math.floor((Number(campoFecha.nanoseconds) || 0) / 1000000);
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }

        // 4. Cadena ISO, timestamp Unix numérico en milisegundos o segundos
        if (typeof campoFecha === 'string' || typeof campoFecha === 'number') {
            const d = new Date(campoFecha);
            if (!isNaN(d.getTime())) {
                return d;
            }
            // Fallback para numéricos pasados como segundos en vez de milisegundos
            if (typeof campoFecha === 'number') {
                const dSeg = new Date(campoFecha * 1000);
                return isNaN(dSeg.getTime()) ? null : dSeg;
            }
        }
    } catch (err) {
        console.error("❌ [CIMCO-DATEUTILS-ERROR] Error deserializando fecha:", err);
    }

    return null;
};