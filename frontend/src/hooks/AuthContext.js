// Versión Arquitectura: V1.2 - Nodo de Contexto Inmutable (HMR Compliant & Exportación Nominal)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthContext.js
 * Misión: Definir el nodo de contexto inmutable para el clúster de autenticación.
 * Integridad: Exportación nombrada para compatibilidad estricta con Vite HMR y React Fast Refresh.
 */

import { createContext } from 'react';

// 🛡️ Inicializamos el contexto como nulo para permitir el blindaje "Anti-Undefined" 
// que configuramos en tu hook useAuth.jsx
export const AuthContext = createContext(null);