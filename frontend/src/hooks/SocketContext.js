// Versión Arquitectura: V15.9 - Declaración Aislada de Contexto para HMR Fast Refresh
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.js
 * Misión: Definición pura del nodo de contexto de WebSockets desacoplado de la lógica del proveedor.
 */

import { createContext } from 'react';

export const SocketContext = createContext(null);

export default SocketContext;