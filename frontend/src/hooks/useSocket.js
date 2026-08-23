// Versión Arquitectura: V19.1 - Hook Consolidado de Consumo del Contexto de Sockets
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useSocket.js
 * Misión: Exponer el canal unificado y reactivo del contexto de sockets de TAXIA CIMCO.
 *         Garantiza la disponibilidad de la instancia Socket, estado de conexión (isConnected),
 *         estado reactivo de ofertas y wrappers de operaciones logísticas (crearSolicitud, enviarOferta, aceptarOferta).
 */

import { useContext } from 'react';
import { SocketContext } from '@/hooks/SocketContext';

export const useSocket = () => {
    const context = useContext(SocketContext);

    if (!context) {
        throw new Error('🚨 [CIMCO-CONTEXT-ERR] useSocket debe ser utilizado estrictamente dentro de un SocketProvider.');
    }

    return context;
};

export default useSocket;