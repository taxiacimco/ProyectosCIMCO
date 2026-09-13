// Versión Arquitectura: V19.2 - Exposición de connectionStatus e Integración de Estado Reactivo de Sockets
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useSocket.js
 * Misión: Exponer el canal unificado y reactivo del contexto de sockets de TAXIA CIMCO.
 *         Garantiza la disponibilidad de la instancia Socket, estado de conexión (isConnected, connectionStatus),
 *         estado reactivo de ofertas y wrappers de operaciones logísticas (crearSolicitud, enviarOferta, aceptarOferta).
 */

import { useContext } from 'react';
import { SocketContext } from '@/hooks/SocketContext';

export const useSocket = () => {
    const context = useContext(SocketContext);

    if (!context) {
        throw new Error('🚨 [CIMCO-CONTEXT-ERR] useSocket debe ser utilizado estrictamente dentro de un SocketProvider.');
    }

    // Blindaje anti-undefined y normalización de estados de conexión para consumo en UI
    const isConnected = Boolean(context.isConnected);
    const connectionStatus = context.connectionStatus || (isConnected ? 'CONNECTED' : 'DISCONNECTED');

    return {
        ...context,
        isConnected,
        connectionStatus
    };
};

export default useSocket;