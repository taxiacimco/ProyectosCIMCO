// Versión Arquitectura: V1.1 - Hook de Consumo del Contexto de Sockets (HMR Compliant)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useSocket.js
 * Misión: Proporcionar acceso seguro al contexto de Sockets sin romper React Fast Refresh.
 */

import { useContext } from 'react';
import { SocketContext } from '@/hooks/SocketContext';

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('🚨 [CIMCO-CONTEXT-ERR] useSocket debe ser utilizado strictly dentro de un SocketProvider.');
    }
    return context;
};

export default useSocket;