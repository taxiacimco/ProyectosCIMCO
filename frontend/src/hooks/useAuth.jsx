// Versión Arquitectura: V20.6 - Unificación de Nodo de Contexto Centralizado
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Proporcionar acceso seguro al contexto de autenticación (CIMCO-NEXUS) sin romper el Fast Refresh.
 * Integridad: Inyección de fallbacks para registerCentral y resetPasswordCentral en el bloque Anti-Undefined.
 */

import { useContext } from 'react';
// 🛡️ Gobernanza de Importaciones: Conexión al nodo raíz inmutable de contexto
import { AuthContext } from '@/hooks/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // 🛡️ Fusión Atómica y Blindaje Anti-Undefined
    if (!context) {
        console.error("🚨 [CIMCO-UI-ERR] useAuth debe ser consumido estrictamente dentro de un AuthProvider.");
        console.warn("⚠️ [CIMCO-SECURITY] Intento de acceso a Auth fuera del Provider. Retornando estado nulo seguro.");
        
        return { 
            user: null, 
            setUser: () => {}, 
            loginLocal: async () => {}, 
            logout: () => {}, 
            registerCentral: async () => {},
            resetPasswordCentral: async () => {},
            loading: false 
        };
    }

    return context;
};