// Versión Arquitectura: V2.0 - PROD READY: Soporte POJO Deserializado y Control Exhaustivo de Instancias Cronológicas Inválidas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\utils\dateFormatter.js
 * Misión: Estandarizar y aislar el formateo cronológico bajo el huso horario oficial de operaciones ('America/Bogota').
 * Ajuste V2.0: Soporte nativo para POJOs sin prototipo (Caché/State), desestructuración de opciones y validador isNaN.
 */

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
        let date;

        // 1. Caso nativo: Instancia clásica de Firebase Timestamp con prototipo activo
        if (typeof fechaOriginal.toDate === 'function') {
            date = fechaOriginal.toDate();
        } 
        // 2. Caso POJO Deserializado: Pérdida de prototipo al viajar por Contexto, Redux, Zustand o LocalStorage ({seconds, nanoseconds})
        else if (fechaOriginal && typeof fechaOriginal === 'object' && 'seconds' in fechaOriginal) {
            date = new Date(fechaOriginal.seconds * 1000);
        } 
        // 3. Casos estándar: Instancia Date nativa, String ISO, o enteros de milisegundos
        else {
            date = new Date(fechaOriginal);
        }

        // 🛡️ Validación Física de Instancia Valida (Evita la propagación de la cadena "Invalid Date")
        if (isNaN(date.getTime())) {
            console.warn("⚠️ [CIMCO-DATE] Estampa de tiempo ilegible o corrupta recibida:", fechaOriginal);
            return "Fecha Inválida";
        }

        // Nomenclatura base unificada para la mesa de control de la central
        const opcionesPredeterminadas = {
            timeZone: 'America/Bogota',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            ...opcionesOverride
        };

        return date.toLocaleString('es-CO', opcionesPredeterminadas);
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