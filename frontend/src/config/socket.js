// Versión Arquitectura: V15.2 - Orquestador y Cliente Central de Socket.io (CIMCO-RADAR LINK)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\socket.js
 * Misión: Configuración y exportación del cliente centralizado de WebSockets acoplado a variables V15.1.
 */

import { io } from 'socket.io-client';

// Determina dinámicamente el canal radial basándose puramente en la variable del entorno actual
const DETERMINAR_SOCKET_URL = () => {
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }
    const HOST_IP = import.meta.env.VITE_HOST_IP || '192.168.100.34';
    return `http://${HOST_IP}:3000`;
};

const SOCKET_URL = DETERMINAR_SOCKET_URL();
const esProduccion = import.meta.env.PROD;

console.log(`📡 [CIMCO-SOCKET] Inicializando canal radial apuntando a: ${SOCKET_URL} | Entorno: ${import.meta.env.MODE}`);

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Evita conexiones zombis antes de que el usuario esté autenticado
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    transports: ['websocket'], // Forzar transporte rápido de WebSocket puro sin polling largo
    secure: esProduccion,      // Habilita wss:// automáticamente si la app corre compilada en la nube
    auth: (cb) => {
        // Inyección dinámica de credenciales seguras en el apretón de manos (handshake)
        const token = localStorage.getItem('cimco_token') || localStorage.getItem('token');
        cb({ token });
    }
});