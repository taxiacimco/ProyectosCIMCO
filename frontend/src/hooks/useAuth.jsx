// Versión Arquitectura: V20.7 - Fallback Rechazante Anti-Undefined en Contexto de Autenticación
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Proporcionar acceso seguro al contexto de autenticación (CIMCO-NEXUS) sin romper el Fast Refresh.
 * Ajuste V20.7: Actualización del fallback de seguridad "Anti-Undefined" para rechazar explícitamente las promesas
 *              de métodos asíncronos cuando useAuth sea consumido fuera de un AuthProvider context.
 */

import { useContext } from 'react';
// 🛡️ Gobernanza de Importaciones: Conexión al nodo raíz inmutable de contexto
import { AuthContext } from '@/hooks/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // 🛡️ Fusión Atómica y Blindaje Anti-Undefined
    if (!context) {
        console.error("🚨 [CIMCO-UI-ERR] useAuth debe ser consumido estrictamente dentro de un AuthProvider.");
        console.warn("⚠️ [CIMCO-SECURITY] Intento de acceso a Auth fuera del Provider. Retornando estado nulo seguro con promesas rechazantes.");
        
        return { 
            user: null, 
            setUser: () => {
                console.warn("⚠️ [CIMCO-AUTH] setUser no está disponible fuera de un AuthProvider.");
            }, 
            loginLocal: async () => {
                throw new Error('loginLocal no está disponible: useAuth debe usarse dentro de un AuthProvider');
            }, 
            logout: () => {
                console.warn("⚠️ [CIMCO-AUTH] logout no está disponible fuera de un AuthProvider.");
            }, 
            registerCentral: async () => {
                throw new Error('registerCentral no está disponible: useAuth debe usarse dentro de un AuthProvider');
            },
            resetPasswordCentral: async () => {
                throw new Error('resetPasswordCentral no está disponible: useAuth debe usarse dentro de un AuthProvider');
            },
            loading: false 
        };
    }

    return context;
};

export default useAuth;