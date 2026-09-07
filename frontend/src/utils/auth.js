// Versión Arquitectura: V1.1 - Normalización de padding Base64URL para decodificación segura de JWT
/**
 * Utilitario de Autenticación - TAXIA CIMCO
 * Ubicación: frontend/src/utils/auth.js
 */

/**
 * Evalúa si un token JWT ha expirado comprobando su campo 'exp'
 * @param {string} token - Token JWT almacenado en el cliente
 * @returns {boolean} true si expiró o es inválido, false si está vigente
 */
export const isTokenExpired = (token) => {
    if (!token || typeof token !== 'string') return true;

    try {
        const partes = token.split('.');
        if (partes.length !== 3) return true;

        // Normalización Base64URL con Padding seguro para atob()
        let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
            base64 += '='.repeat(4 - pad);
        }

        const payloadDecoded = JSON.parse(atob(base64));

        if (!payloadDecoded || !payloadDecoded.exp) return false;

        const tiempoActualSec = Math.floor(Date.now() / 1000);
        return payloadDecoded.exp < tiempoActualSec;
    } catch (error) {
        console.error("🚨 Error al validar token JWT en utils/auth:", error.message);
        return true;
    }
};

/**
 * Recupera el token del almacenamiento local o de sesión
 */
export const obtenerTokenLocal = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};