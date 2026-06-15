// Versión Arquitectura: V20.5 - Resolución de Exportación useAuth para HMR
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveedor de Estado Global de Autenticación para TAXIA CIMCO.
 * Ajuste: Inyección del hook useAuth exportado para compatibilidad con AdminDashboard y Vite HMR.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
// 🛡️ Importaciones nativas del SDK de Firebase
import { getAuth, signInAnonymously, signOut } from 'firebase/auth'; 

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // 📡 Inicialización analítica perimetral de la sesión
    useEffect(() => {
        const initializeSession = async () => {
            try {
                localStorage.removeItem('token');
                localStorage.removeItem('taxia_token');

                const token = localStorage.getItem('cimco_token');
                
                if (token && token !== 'undefined' && token !== 'null') {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const savedUserRaw = localStorage.getItem('cimco_user');
                    
                    if (savedUserRaw && savedUserRaw !== 'undefined' && savedUserRaw !== 'null') {
                        setUser(JSON.parse(savedUserRaw));
                    } else {
                        console.warn("⚠️ [CIMCO-SECURITY] Matriz de usuario ausente o corrupta. Purgando sesión...");
                        localStorage.removeItem('cimco_token');
                        delete api.defaults.headers.common['Authorization'];
                    }
                } else {
                    localStorage.removeItem('cimco_token');
                    localStorage.removeItem('cimco_user');
                    delete api.defaults.headers.common['Authorization'];
                }

                const authFirebase = getAuth();
                
                if (!authFirebase.currentUser) {
                    await signInAnonymously(authFirebase)
                        .then(() => {
                            console.log("📡 [CIMCO-AUTH] Handshake anónimo con Firebase completado con éxito.");
                        })
                        .catch((firebaseError) => {
                            console.warn("⚠️ [CIMCO-AUTH-WARN] Firebase Auth Anónimo deshabilitado o rechazado. Modo Contingencia Activo:", firebaseError.message);
                        });
                }

            } catch (error) {
                console.error("🚨 [CIMCO-AUTH-CRITIC] Falla atómica al inicializar la sesión global:", error.message);
                localStorage.removeItem('cimco_user');
                localStorage.removeItem('cimco_token');
                delete api.defaults.headers.common['Authorization'];
                setUser(null);
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        initializeSession();
    }, []);

    const loginLocal = async (userData, token) => {
        setLoading(true);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('taxia_token');

            if (token && token !== 'undefined' && token !== 'null') {
                localStorage.setItem('cimco_token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            
            const assignedRole = userData?.role || userData?.rol || ROLES.PASAJERO;
            const assignedAccess = userData?.access_level !== undefined 
                                   ? userData.access_level 
                                   : (DEFAULT_ACCESS_LEVELS[assignedRole] || 0);
    
            const normalizedUser = { 
                ...userData, 
                role: assignedRole,
                access_level: assignedAccess
            };
    
            localStorage.setItem('cimco_user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);

            const authFirebase = getAuth();
            if (!authFirebase.currentUser) {
                await signInAnonymously(authFirebase).catch(() => {});
            }

            return { success: true };
        } catch (error) {
            console.error("❌ Error en compuerta loginLocal:", error.message);
            return { success: false, message: "Falla estructural al persistir credenciales locales." };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        localStorage.removeItem('cimco_token');
        localStorage.removeItem('cimco_user');
        localStorage.removeItem('token');
        localStorage.removeItem('taxia_token');
        
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        
        try {
            const authFirebase = getAuth();
            if (authFirebase.currentUser) {
                await signOut(authFirebase);
            }
        } catch (error) {
            console.error("Error al cerrar sesión en Firebase:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, initialized, loginLocal, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// 🛡️ EXPORTACIÓN NOMBRADA DEL HOOK DE AUTENTICACIÓN
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("🚨 [CIMCO-UI-ERR] useAuth debe ser consumido estrictamente dentro de un AuthProvider.");
    }
    return context;
};