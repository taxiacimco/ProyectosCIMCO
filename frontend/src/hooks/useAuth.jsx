// Versión Arquitectura: V20.4 - Aislamiento HMR Vite y Consumo Seguro del Contexto
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Proporcionar acceso seguro al contexto de autenticación (CIMCO-NEXUS) sin romper el Fast Refresh.
 * Integridad: Consumo directo del nodo inmutable AuthContext mediante alias absoluto.
 */

import { useContext } from 'react';
// 🛡️ Gobernanza de Importaciones: Uso estricto de alias absoluto @/ para blindar el motor Vite
import { AuthContext } from '@/hooks/AuthProvider';

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // 🛡️ Fusión Atómica y Blindaje Anti-Undefined:
    // Mantiene la alerta crítica solicitada mientras preserva el retorno seguro del código base
    // para evitar quiebres descontrolados en el renderizado si ocurre un desbordamiento.
    if (!context) {
        console.error("🚨 [CIMCO-UI-ERR] useAuth debe ser consumido estrictamente dentro de un AuthProvider.");
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