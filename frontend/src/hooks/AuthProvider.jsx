// Versión Arquitectura: V24.1 - Integración Quirúrgica con Servicio Centralizado authService
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\AuthProvider.jsx
 * Misión: Proveedor de Estado Global de Autenticación para TAXIA CIMCO con soporte para auto-cleanup, refresco de tokens, sanitización de entrada y consumo centralizado de authService.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/config/api';
import authService from '@/services/authService';
import { ROLES, DEFAULT_ACCESS_LEVELS } from '@/config/constants';
import { auth } from '@/config/firebase';
import { signInAnonymously, signOut, sendPasswordResetEmail } from 'firebase/auth'; 
import { AuthContext } from '@/hooks/AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // 🧹 Método de Deslogueo Atómico de la aplicación
    const logout = useCallback(async () => {
        // Purga de seguridad completa de la aplicación durante el Logout
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem('cimco_token');
            localStorage.removeItem('cimco_user');
            localStorage.removeItem('token');
            localStorage.removeItem('taxia_token');
        }
        
        if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
            delete api.defaults.headers.common['Authorization'];
        }
        setUser(null);
        
        try {
            await authService.logout();
        } catch (authSvcError) {
            console.warn("⚠️ [CIMCO-AUTH] Notificación de logout al servidor ejecutada o no disponible:", authSvcError?.message);
        }

        try {
            if (auth && auth.currentUser) {
                await signOut(auth);
                console.log("🧹 [CIMCO-AUTH] Canal satelital Firebase cerrado de forma segura.");
            }
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Error al cerrar sesión en Firebase:", error);
        }
    }, []);

    // 🔄 Método de Verificación / Refresco del Token con el Nodo Central
    const refreshToken = useCallback(async () => {
        try {
            const tokenExistente = typeof window !== 'undefined' && window.localStorage 
                ? (localStorage.getItem('cimco_token') || localStorage.getItem('token'))
                : null;

            if (!tokenExistente) {
                await logout();
                return { success: false, message: 'No hay token activo para verificar.' };
            }

            // Intento de re-validación de identidad contra el backend central consumiendo authService
            const respuestaData = await authService.getProfile();
            if (respuestaData && (respuestaData.success || respuestaData.user || respuestaData.usuario)) {
                const userData = respuestaData.user || respuestaData.usuario || respuestaData.data?.user;
                if (userData) {
                    userData.uid = userData._id || userData.id || userData.uid || userData.conductorId;
                    userData._id = userData._id || userData.uid || userData.id || userData.conductorId;
                    setUser(userData);
                    if (typeof window !== 'undefined' && window.localStorage) {
                        localStorage.setItem('cimco_user', JSON.stringify(userData));
                    }
                }
                return { success: true, user: userData, data: respuestaData };
            } else {
                await logout();
                return { success: false, message: 'Nodo de identidad no válido o expirado.' };
            }
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Error al intentar re-validar sesión:", error);
            await logout();
            return { success: false, error };
        }
    }, [logout]);

    // 🎧 Listener Event-Driven para Captura Global de Expiración (Sincronización con Interceptor HTTP api.js)
    useEffect(() => {
        const handleAuthExpired = (event) => {
            console.warn("⚠️ [CIMCO-AUTH] Evento cimco:auth_expired capturado. Ejecutando purga global de sesión.", event?.detail);
            logout();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('cimco:auth_expired', handleAuthExpired);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('cimco:auth_expired', handleAuthExpired);
            }
        };
    }, [logout]);

    // 📡 Inicialización analítica perimetral de la sesión
    useEffect(() => {
        const initializeSession = async () => {
            try {
                // 🛡️ Búsqueda aislada usando exclusivamente la clave oficial del sistema
                const token = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('cimco_token') : null;
                
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
                if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.removeItem('cimco_token');
                    localStorage.removeItem('cimco_user');
                }
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
            
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('cimco_user', JSON.stringify(usuarioActualizado));
            }
            return usuarioActualizado;
        });
    };

    const loginLocal = async (identifierInput, password) => {
        try {
            setLoading(true);
            
            // 1. Sanitización Telco: Limpiar espacios y remover prefijos +57 o 57 cuando corresponda
            let limpio = String(identifierInput || '').trim().replace(/\s+/g, '');

            if (limpio.startsWith('+57')) {
                limpio = limpio.slice(3);
            } else if (limpio.startsWith('57') && limpio.length === 12) {
                limpio = limpio.slice(2);
            }

            // 2. Construcción del payload defensivo con redundancia polimórfica
            const payload = {
                loginInput: limpio,
                identifier: limpio,
                email: limpio,
                telefono: limpio,
                celular: limpio,
                password: password
            };

            // 3. Petición POST al endpoint de autenticación consumiendo authService
            const respuestaData = await authService.login(payload);
            
            if (respuestaData && (respuestaData.success || respuestaData.token)) {
                const token = respuestaData.token || respuestaData.data?.token;
                const userData = respuestaData.user || respuestaData.data?.user;
                
                if (userData) {
                    userData.uid = userData._id || userData.id || userData.uid || userData.conductorId;
                    userData._id = userData._id || userData.uid || userData.id || userData.conductorId;
                    userData.role = userData.role || userData.rol || ROLES.PASAJERO;
                    userData.rol = userData.rol || userData.role || ROLES.PASAJERO;
                    userData.access_level = userData.access_level || DEFAULT_ACCESS_LEVELS[userData.role] || 1;
                }

                if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem('cimco_token', token);
                    localStorage.setItem('cimco_user', JSON.stringify(userData));
                }
                
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser(userData);

                try {
                    if (auth && !auth.currentUser) {
                        await signInAnonymously(auth);
                    }
                } catch (fbError) {
                    console.warn("⚠️ [CIMCO-AUTH-WARNING] El puente satelital Firebase falló de forma no fatal:", fbError.message);
                }

                return { success: true, user: userData, data: respuestaData };
            }
            
            // Si la respuesta HTTP no confirma éxito, instanciar y lanzar error explícito
            const mensajeError = respuestaData?.message || "Credenciales incorrectas o usuario no encontrado.";
            const errorRespuesta = new Error(mensajeError);
            errorRespuesta.data = respuestaData;
            throw errorRespuesta;

        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Error crítico en pasarela loginLocal:", error);
            // Re-lanzamiento explícito de la excepción para permitir captura mediante try/catch en el frontend (ej. Login.jsx)
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const registerCentral = async (payload) => {
        try {
            setLoading(true);
            const respuestaData = await authService.register(payload);
            if (respuestaData && respuestaData.success) {
                return { success: true, data: respuestaData };
            }
            return { success: false, message: respuestaData?.message || "No se pudo completar el registro central." };
        } catch (error) {
            console.error("❌ [CIMCO-AUTH] Falla perimetral en método registerCentral:", error);
            return { 
                success: false, 
                message: error.response?.data?.message || error.message || "Error de red al intentar persistir el nodo de identidad." 
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
            refreshToken,
            registerCentral, 
            resetPasswordCentral 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};