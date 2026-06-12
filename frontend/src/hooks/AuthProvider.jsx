// Versión Arquitectura: V20.1 - Purga de Vulnerabilidad de Escalada de Privilegios y Consolidación JWT
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveedor de contexto global para la gestión de identidad y sincronización de sesiones (JWT).
 * Ajuste: Remoción de brecha crítica de seguridad (Fallback Admin Lvl 99) y fortalecimiento del escudo Anti-Undefined.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
// 🛡️ Gobernanza de Importaciones: Consumir el Contexto desde su nodo inmutable nativo
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 🔄 Función asíncrona blindada contra el parpadeo de rutas (Race Conditions)
    const loginLocal = async (userData, token) => {
        // Enclavar el estado de carga antes de mutar la memoria
        setLoading(true);

        // 🛡️ Anti-Undefined: Validar existencia y consistencia del token
        if (token && token !== 'undefined' && token !== 'null') {
            localStorage.setItem('cimco_token', token);
            localStorage.setItem('taxia_token', token);
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        // 🚀 Saneamiento de Rol y Nivel de Acceso usando Gobernanza Central
        const assignedRole = userData?.role || userData?.rol || ROLES.PASAJERO;
        const assignedAccess = userData?.access_level !== undefined 
                               ? userData.access_level 
                               : (DEFAULT_ACCESS_LEVELS[assignedRole] || 0);

        const normalizedUser = { 
            ...userData, 
            role: assignedRole,
            access_level: assignedAccess
        };

        // Persistencia atómica en almacenamiento local
        localStorage.setItem('cimco_user', JSON.stringify(normalizedUser));
        
        // Mutación del estado de React
        setUser(normalizedUser);

        // ⏱️ Micro-Tick de sincronización para que el Contexto inunde el árbol de componentes
        await new Promise(resolve => setTimeout(resolve, 80));

        // Liberación segura del flujo de rutas
        setLoading(false);
    };

    const logout = () => {
        localStorage.removeItem('cimco_token');
        localStorage.removeItem('token');
        localStorage.removeItem('taxia_token');
        localStorage.removeItem('cimco_user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem('cimco_token') || localStorage.getItem('token') || localStorage.getItem('taxia_token');
        
        if (token && token !== 'undefined' && token !== 'null') {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            try {
                const savedUserRaw = localStorage.getItem('cimco_user');
                
                // 🛡️ Guarda de Seguridad Interna (Anti-Undefined estricto)
                if (savedUserRaw && savedUserRaw !== 'undefined' && savedUserRaw !== 'null') {
                    const savedUser = JSON.parse(savedUserRaw);
                    setUser(savedUser);
                } else {
                    // 🛡️ CIERRE DE BRECHA: Purga de credenciales corruptas
                    console.warn("⚠️ [CIMCO-SECURITY] Token detectado pero matriz de usuario ausente o corrupta. Purgando sesión...");
                    localStorage.removeItem('cimco_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('taxia_token');
                    delete axios.defaults.headers.common['Authorization'];
                    setUser(null);
                }
            } catch (e) {
                console.error("❌ [CIMCO-AUTH-FATAL] Falla estructural al leer datos de identidad local:", e);
                localStorage.removeItem('cimco_user');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loginLocal, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};