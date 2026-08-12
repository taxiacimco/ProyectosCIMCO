// Versión Arquitectura: V16.2 - Control Adaptativo de Reconexión y Detención Anti-Bucle en Fallos Auth
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\socket.js
 * Misión: Orquestador central de WebSockets adaptativo. Detecta automáticamente HTTPS/HTTP,
 *         túneles Cloudflare/Ngrok, IP de red LAN y gestiona reconexiones inteligentes con
 *         detención automática ante fallos de autenticación JWT.
 */

import { io } from 'socket.io-client';
import { HOST_IP } from '@/config/api.js';

/**
 * 🔌 RESOLUCIÓN DINÁMICA DE ENDPOINT PARA WEBSOCKETS
 * Determina inteligentemente si debe usar WSS/HTTPS o WS/HTTP para prevenir el bloqueo por Mixed Content.
 */
const DETERMINAR_SOCKET_URL = () => {
    // 1. Prioridad: Variables de entorno explícitas (Vite / Vercel -> Railway)
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }

    if (import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL;
    }

    // 2. Detección en entorno de ejecución del navegador
    if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:';
        const hostname = window.location.hostname;

        // 🛡️ CASO A: Acceso mediante Túnel Cloudflare / Ngrok o Dominio Seguro en la nube
        if (isSecure && (hostname.includes('trycloudflare.com') || hostname.includes('ngrok-free.dev') || hostname.includes('vercel.app'))) {
            console.log("🔒 [CIMCO-SOCKET] Detección de Túnel HTTPS/WSS Activo. Redirigiendo Socket por el túnel seguro.");
            return window.location.origin; // Reutiliza la misma URL base del túnel cifrado
        }

        // 🛡️ CASO B: Acceso Local vía IP LAN (ej. http://192.168.100.34:5173)
        if (hostname === HOST_IP || hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:3000`;
        }
    }

    // 3. Fallback Estándar de Red Local
    return `http://${HOST_IP || 'localhost'}:3000`;
};

const SOCKET_URL = DETERMINAR_SOCKET_URL();
const isSecureProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:';

console.log(`📡 [CIMCO-SOCKET] Inicializando canal radial adaptativo en: ${SOCKET_URL} | Seguro: ${isSecureProtocol}`);

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Evita conexiones zombis antes de autenticar al usuario
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'], // Polling de respaldo en redes móviles restrictivas (4G/5G)
    secure: isSecureProtocol, // Forzado dinámico de seguridad cifrada TLS
    rejectUnauthorized: false,
    withCredentials: true,
    auth: (cb) => {
        // Inyección dinámica de credenciales seguras en el apretón de manos (handshake) con guarda anti-undefined
        const token = typeof window !== 'undefined' && window.localStorage 
            ? (localStorage.getItem('cimco_token') || localStorage.getItem('token') || '')
            : '';
        cb({ token });
    }
});

// 🛡️ GUARDA ANTI-BUCLE: Detener reconexión automática si el error de conexión es por falla de autenticación
socket.on('connect_error', (error) => {
    const errorMsg = error?.message || '';
    const errorReason = error?.data?.reason || '';
    const errorCode = error?.data?.code || '';

    const esErrorAuth = errorMsg.includes('Autenticación rechazada') ||
                        errorMsg.includes('AUTH_EXPIRED') ||
                        errorMsg.includes('INVALID_TOKEN') ||
                        errorMsg.includes('TOKEN') ||
                        errorReason === 'nodo_inexistente' ||
                        errorCode.startsWith('TOKEN_');

    if (esErrorAuth) {
        console.warn('⚠️ [CIMCO-SOCKET] Rechazo por autenticación inválida o token expirado. Abortando reintentos infinitos.');
        socket.active = false; // Deshabilita reconexiones automáticas en Socket.io client
    }
});

export default socket;