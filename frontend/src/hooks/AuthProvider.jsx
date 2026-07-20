// Versión Arquitectura: V21.8 - Tolerancia a Fallos Satelitales Firebase y Sincronización Estricta MongoDB-Firebase
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveedor de Estado Global de Autenticación para TAXIA CIMCO.
 */

import React, { useState, useEffect } from 'react';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { getAuth, signInAnonymously, signOut, sendPasswordResetEmail } from 'firebase/auth'; 
import { AuthContext } from '@/hooks/AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // 📡 Inicialización analítica perimetral de la sesión
    useEffect(() => {
        const initializeSession = async () => {
            try {
                // Purgamos posibles tokens residuales antiguos para evitar interferencias
                localStorage.removeItem('token');
                localStorage.removeItem('taxia_token');

                const token = localStorage.getItem('cimco_token');
                
                if (token && token !== 'undefined' && token !== 'null') {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const savedUser = localStorage.getItem('cimco_user');
                    
                    if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
                        const parsedUser = JSON.parse(savedUser);
                        
                        // Guardas de Seguridad (Anti-Undefined): Sincronizar de forma atómica uid con el _id nativo de MongoDB Atlas
                        if (parsedUser) {
                            parsedUser.uid = parsedUser.uid || parsedUser._id || parsedUser.id || parsedUser.conductorId;
                            parsedUser._id = parsedUser._id || parsedUser.uid || parsedUser.id || parsedUser.conductorId;
                        }
                        setUser(parsedUser);
                    }
                } else {
                    // 🛡️ PROTECCIÓN ANTI-FALLO FATAL: Canal anónimo envuelto para tolerancia a fallos
                    try {
                        const authFirebase = getAuth();
                        if (!authFirebase.currentUser) {
                            await signInAnonymously(authFirebase);
                            console.log("📡 [CIMCO-AUTH] Canal anónimo de telemetría desplegado con éxito.");
                        }
                    } catch (fbError) {
                        console.warn("⚠️ [CIMCO-AUTH-FALLBACK] No se pudo levantar el canal anónimo de Firebase de inmediato. Operando en modo local desconectado:", fbError.message);
                    }
                }
            } catch (error) {
                console.error("❌ [CIMCO-AUTH-FATAL] Fallo en la inicialización del ecosistema de identidad:", error);
                localStorage.removeItem('cimco_token');
                localStorage.removeItem('cimco_user');
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        initializeSession();
    }, []);

    // ⚡ Mutador Local Inyectado al árbol de contexto para evitar bucles infinitos en useWallet
    const actualizarEstadoLocal = (nuevosDatos) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const usuarioActualizado = { ...prevUser, ...nuevosDatos };
            
            // Blindaje de identidad en mutaciones reactivas en caliente
            usuarioActualizado.uid = usuarioActualizado.uid || usuarioActualizado._id || usuarioActualizado.id || usuarioActualizado.conductorId;
            usuarioActualizado._id = usuarioActualizado._id || usuarioActualizado.uid || usuarioActualizado.id || usuarioActualizado.conductorId;
            
            localStorage.setItem('cimco_user', JSON.stringify(usuarioActualizado));
            return usuarioActualizado;
        });
    };

    const loginLocal = async (email, password) => {
        try {
            setLoading(true);
            
            // ⚡ CORE FIX: Cambiamos 'email' por 'identifier' para cumplir con los requerimientos estrictos del validador de backend
            const respuesta = await api.post('/auth/login', { 
                identifier: email, 
                password: password 
            });
            
            if (respuesta.data && respuesta.data.success) {
                const { token, user: userData } = respuesta.data;
                
                // Guardas de Seguridad (Anti-Undefined): Sincronizar de forma atómica uid con el _id nativo de MongoDB Atlas
                if (userData) {
                    userData.uid = userData._id || userData.id || userData.uid || userData.conductorId;
                    userData._id = userData._id || userData.uid || userData.id || userData.conductorId;
                    userData.role = userData.role || userData.rol || ROLES.PASAJERO;
                    userData.rol = userData.rol || userData.role || ROLES.PASAJERO;
                    userData.access_level = userData.access_level || DEFAULT_ACCESS_LEVELS[userData.role] || 1;
                }

                localStorage.setItem('cimco_token', token);
                localStorage.setItem('cimco_user', JSON.stringify(userData));
                
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser(userData);

                // 🛡️ Autenticación paralela en Firebase protegida contra fallos (Tolerancia del Ecosistema)
                try {
                    const authFirebase = getAuth();
                    if (!authFirebase.currentUser) {
                        await signInAnonymously(authFirebase);
                        console.log("📡 [CIMCO-AUTH-FIREBASE] Enlace satelital anónimo acoplado con éxito.");
                    }
                } catch (fbError) {
                    console.warn("⚠️ [CIMCO-AUTH-WARNING] El puente satelital Firebase falló de forma no fatal. Operando en modo degradado local:", fbError.message);
                }

                return { success: true, user: userData };
            }
            
            return { success: false, message: respuesta.data?.message || "Credenciales incorrectas." };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Error crítico en pasarela loginLocal:", error);
            return { 
                success: false, 
                message: error.response?.data?.message || "Error de comunicación con el nodo central de TAXIA CIMCO." 
            };
        } finally {
            setLoading(false);
        }
    };

    const registerCentral = async (payload) => {
        try {
            setLoading(true);
            const respuesta = await api.post('/auth/register', payload);
            if (respuesta.data && respuesta.data.success) {
                return { success: true, data: respuesta.data };
            }
            return { success: false, message: respuesta.data?.message || "No se pudo completar el registro central." };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Falla perimetral en método registerCentral:", error);
            return { 
                success: false, 
                message: error.response?.data?.message || "Error de red al intentar persistir el nodo de identidad." 
            };
        } finally {
            setLoading(false);
        }
    };

    const resetPasswordCentral = async (email) => {
        try {
            const authFirebase = getAuth();
            await sendPasswordResetEmail(authFirebase, email);
            return { success: true };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Quiebre en la pasarela de recuperación de Firebase:", error);
            return { success: false, message: "No se pudo procesar la solicitud. Verifique el correo o intente más tarde." };
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
                console.log("🧹 [CIMCO-AUTH] Canal satelital Firebase cerrado y purgado de forma segura.");
            }
        } catch (error) {
            console.error("Error al cerrar sesión en Firebase:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            setUser, 
            actualizarEstadoLocal, 
            loading, 
            initialized, 
            loginLocal, 
            logout, 
            registerCentral, 
            resetPasswordCentral 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};