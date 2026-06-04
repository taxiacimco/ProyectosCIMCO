// Versión Arquitectura: V16.2 - Fusión Atómica: Homologación a 'cimco_token' manteniendo ecosistema Firebase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useAuth.jsx
 * Misión: Proveer el bus único de autenticación, re-hidratación de tokens y blindaje anti-undefined.
 * Ajuste: Unificación de clave de persistencia a 'cimco_token' manteniendo dependencias de Firebase/Firestore.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 1. CREACIÓN DEL CONTEXTO GLOBAL
export const AuthContext = createContext(null);

// 🔐 Función utilitaria para decodificar JWT sin dependencias externas pesadas
const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// 2. PROVEEDOR DE ESTADO (AuthProvider)
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 🔄 Lógica de Inyección de Sesión (Homologada a 'cimco_token')
    const loginLocal = (userData, token) => {
        try {
            // Sincronización de clave: Ahora usamos 'cimco_token' para compatibilidad con Login.jsx
            localStorage.setItem('cimco_token', token);
            localStorage.setItem('userRole', userData.rol);
            
            // 📡 TELEMETRÍA DE PERSISTENCIA
            console.log("✅ [CIMCO-AUTH-SYNC] Persistencia en localStorage exitosa:");
            console.log("   ├─ Token Indexado (cimco_token):", token ? "OK" : "NULL");
            console.log("   └─ Rol Indexado:", userData.rol);
            
            setUser(userData);
        } catch (error) {
            console.error("❌ [CIMCO-AUTH-FATAL] Error crítico al persistir sesión:", error);
        }
    };

    const logout = () => {
        localStorage.removeItem('cimco_token');
        localStorage.removeItem('userRole');
        setUser(null);
    };

    // Efecto de Re-hidratación (JWT + Firebase)
    useEffect(() => {
        const token = localStorage.getItem('cimco_token');
        if (token) {
            const decoded = parseJwt(token);
            if (decoded) {
                // Aquí podrías validar expiración del token
                setUser(decoded);
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

// 3. HOOK DE CONSUMO (Blindado con Guardia de Seguridad)
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
    if (!context) {
        console.warn("⚠️ [CIMCO-SECURITY-ALERT] El hook useAuth fue ejecutado fuera del perímetro de AuthProvider.");
        return {
            user: null,
            setUser: () => console.warn("⚠️ [CIMCO-AUTH] setUser omitido por contexto nulo."),
            loginLocal: () => console.error("❌ [CIMCO-AUTH] Sesión rechazada: Proveedor desconectado."),
            logout: () => {},
            loading: false,
            error: "Contexto no inicializado"
        };
    }
    return context;
};