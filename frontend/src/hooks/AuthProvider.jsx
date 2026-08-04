// Versión Arquitectura: V22.2 - Normalización de Carga Útil en Login Local
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveedor de Estado Global de Autenticación para TAXIA CIMCO.
 * Ajuste V22.2: Normalización de la carga útil (payload) en loginLocal enviando identifier, 
 *              email, telefono y celular limpios para máxima compatibilidad con endpoints legados.
 */

import React, { useState, useEffect } from 'react';
import api from '@/config/api';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { auth } from '@/config/firebase';
import { signInAnonymously, signOut, sendPasswordResetEmail } from 'firebase/auth'; 
import { AuthContext } from '@/hooks/AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // 📡 Inicialización analítica perimetral de la sesión
    useEffect(() => {
        const initializeSession = async () => {
            try {
                // 🛡️ Búsqueda aislada usando exclusivamente la clave oficial del sistema
                const token = localStorage.getItem('cimco_token');
                
                if (token && token !== 'undefined' && token !== 'null') {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const savedUser = localStorage.getItem('cimco_user');
                    
                    if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
                        const parsedUser = JSON.parse(savedUser);
                        
                        // Guardas de Seguridad (Anti-Undefined): Sincronizar de forma atómica uid con el _id nativo
                        if (parsedUser) {
                            parsedUser.uid = parsedUser.uid || parsedUser._id || parsedUser.id || parsedUser.conductorId;
                            parsedUser._id = parsedUser._id || parsedUser.uid || parsedUser.id || parsedUser.conductorId;
                        }
                        setUser(parsedUser);
                    }
                } else {
                    // 🛡️ PROTECCIÓN ANTI-FALLO FATAL: Canal anónimo envuelto para tolerancia a fallos
                    try {
                        if (auth && !auth.currentUser) {
                            await signInAnonymously(auth);
                            console.log("📡 [CIMCO-AUTH] Canal anónimo de telemetría desplegado con éxito.");
                        }
                    } catch (fbError) {
                        console.warn("⚠️ [CIMCO-AUTH-FALLBACK] Canal anónimo de Firebase no disponible. Operando en modo local:", fbError.message);
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

    // ⚡ Mutador Local Inyectado al árbol de contexto para evitar bucles infinitos
    const actualizarEstadoLocal = (nuevosDatos) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const usuarioActualizado = { ...prevUser, ...nuevosDatos };
            
            usuarioActualizado.uid = usuarioActualizado.uid || usuarioActualizado._id || usuarioActualizado.id || usuarioActualizado.conductorId;
            usuarioActualizado._id = usuarioActualizado._id || usuarioActualizado.uid || usuarioActualizado.id || usuarioActualizado.conductorId;
            
            localStorage.setItem('cimco_user', JSON.stringify(usuarioActualizado));
            return usuarioActualizado;
        });
    };

    const loginLocal = async (identifierInput, password) => {
        try {
            setLoading(true);
            const limpio = identifierInput ? String(identifierInput).trim() : '';
            
            // Envío con redundancia táctica para garantizar compatibilidad con cualquier controlador backend
            const respuesta = await api.post('/auth/login', { 
                identifier: limpio,
                email: limpio,
                telefono: limpio,
                celular: limpio,
                password: password 
            });
            
            if (respuesta.data && (respuesta.data.success || respuesta.data.token)) {
                const token = respuesta.data.token || respuesta.data.data?.token;
                const userData = respuesta.data.user || respuesta.data.data?.user;
                
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

                try {
                    if (auth && !auth.currentUser) {
                        await signInAnonymously(auth);
                    }
                } catch (fbError) {
                    console.warn("⚠️ [CIMCO-AUTH-WARNING] El puente satelital Firebase falló de forma no fatal:", fbError.message);
                }

                return { success: true, user: userData, data: respuesta.data };
            }
            
            return { 
                success: false, 
                message: respuesta.data?.message || "Credenciales incorrectas o usuario no encontrado." 
            };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Error crítico en pasarela loginLocal:", error);
            return { 
                success: false, 
                message: error.response?.data?.message || "Usuario no registrado en producción o contraseña incorrecta." 
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
            if (!auth) throw new Error("Instancia de Firebase Auth no inicializada.");
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Quiebre en la pasarela de recuperación de Firebase:", error);
            return { success: false, message: "No se pudo procesar la solicitud. Verifique el correo o intente más tarde." };
        }
    };

    const logout = async () => {
        // 🧹 Purga de seguridad completa de la aplicación durante el Logout explícito
        localStorage.removeItem('cimco_token');
        localStorage.removeItem('cimco_user');
        localStorage.removeItem('token');
        localStorage.removeItem('taxia_token');
        
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        
        try {
            if (auth && auth.currentUser) {
                await signOut(auth);
                console.log("🧹 [CIMCO-AUTH] Canal satelital Firebase cerrado de forma segura.");
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
            login: loginLocal, 
            logout, 
            registerCentral, 
            resetPasswordCentral 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};