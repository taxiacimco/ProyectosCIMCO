// Versión Arquitectura: V1.0 - Orquestador y Cliente Central de Socket.io (CIMCO-RADAR LINK)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\socket.js
 * Misión: Configuración y exportación del cliente centralizado de WebSockets.
 * Características: Reconexión inteligente, desactivación de auto-conexión por defecto e inyección dinámica del token.
 */

import { io } from 'socket.io-client';

// Extrae la URL de las variables de entorno configuradas (ej. tu túnel Ngrok o IP de Red Local)
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') 
    : 'http://localhost:3000';

console.log(`📡 [CIMCO-SOCKET] Inicializando canal radial apuntando a: ${SOCKET_URL}`);

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Evita conexiones zombis antes de que el usuario esté autenticado
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    transports: ['websocket'], // Forzar transporte rápido de WebSocket puro
    auth: (cb) => {
        // Inyección dinámica de credenciales seguras en el apretón de manos (handshake)
        const token = localStorage.getItem('cimco_token');
        cb({ token });
    }
});