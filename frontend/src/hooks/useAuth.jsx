// Versión Arquitectura: V20.3 - Hook de Consumo Puro (Fast Refresh Compliant)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Proporcionar acceso seguro al contexto de autenticación (CIMCO-NEXUS).
 * Integridad: Consumo directo del nodo inmutable AuthContext para evitar invalidaciones HMR de Vite.
 */

import { useContext } from 'react';
// 🛡️ Importación directa desde el nodo de contexto inmutable (AuthContext.js)
// Esto evita que Vite rompa el Fast Refresh al intentar recargar el Provider.
import { AuthContext } from './AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // 🛡️ Blindaje anti-undefined: 
    // Retorna un estado seguro y controlado si el componente intenta acceder 
    // al contexto fuera del alcance del AuthProvider.
    if (!context) {
        console.warn("⚠️ [CIMCO-SECURITY] Intento de acceso a Auth fuera del Provider. Retornando estado nulo seguro.");
        return { 
            user: null, 
            setUser: () => {}, 
            loginLocal: async () => {}, 
            logout: () => {}, 
            loading: false 
        };
    }
    
    return context;
};