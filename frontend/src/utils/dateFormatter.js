// Versión Arquitectura: V2.2 - Purga explícita de claves undefined para sanitización de opciones en Intl.DateTimeFormat
/**
 * Ubicación: frontend/src/utils/dateFormatter.js
 * Misión: Estandarizar y aislar el formateo cronológico bajo el huso horario oficial de operaciones ('America/Bogota').
 * Refactor V2.2: Purga de propiedades undefined para evitar distorsiones de formato en toLocaleString.
 */

import { resolverFechaSegura } from '@/utils/dateUtils';

/**
 * Formatea un timestamp híbrido a la nomenclatura cronológica oficial de Colombia (dd/mm/aaaa, hh:mm:ss AM/PM).
 * @param {any} fechaOriginal - Timestamp de Firestore, Date, String ISO, Milisegundos o POJO {seconds, nanoseconds}
 * @param {Object} opcionesOverride - Configuración adicional para alterar el formato de salida (Intl.DateTimeFormat)
 * @returns {string} Fecha formateada o fallback controlado de seguridad
 */
export const formatFechaColombia = (fechaOriginal, opcionesOverride = {}) => {
    // 🛡️ Guarda Anti-Undefined
    if (!fechaOriginal) return "S/D";
    
    try {
        // Delegación de resolución al helper centralizado
        const date = resolverFechaSegura(fechaOriginal);

        // 🛡️ Validación Física de Instancia Válida
        if (!date || isNaN(date.getTime())) {
            console.warn("⚠️ [CIMCO-DATE] Estampa de tiempo ilegible o corrupta recibida:", fechaOriginal);
            return "Fecha Inválida";
        }

        // Nomenclatura base unificada para la mesa de control de la central
        const opcionesBase = {
            timeZone: 'America/Bogota',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };

        // Fusionar y eliminar claves asignadas explícitamente a undefined
        const opcionesFinales = { ...opcionesBase, ...opcionesOverride };
        Object.keys(opcionesFinales).forEach(
            (key) => opcionesFinales[key] === undefined && delete opcionesFinales[key]
        );

        return date.toLocaleString('es-CO', opcionesFinales);
    } catch (error) {
        console.error("❌ [CIMCO-DATE-CRITICAL] Fallo de procesamiento en el motor de tiempo:", error);
        return "Error de Fecha";
    }
};

/**
 * Extrae de forma exclusiva el componente de tiempo (HH:MM:SS AM/PM).
 * Ideal para hilos de despacho inmediato, solicitudes entrantes y telemetría de radar de la flota.
 */
export const formatHoraColombia = (fechaOriginal) => {
    return formatFechaColombia(fechaOriginal, {
        day: undefined,
        month: undefined,
        year: undefined
    });
};