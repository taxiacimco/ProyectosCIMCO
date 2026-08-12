// Versión Arquitectura: V16.2 - Captura Global de 'auth_expired' y Desconexión de Sesión Expirada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo acoplado a la instancia centralizada, con soporte de auto-reingreso a salas, escucha global de solicitudes de viaje y purga atómica ante expiración de token.
 * Ajuste V16.2: Registro de listener para evento 'auth_expired' emitido desde el socket manager para limpiar credenciales y redirigir al login.
 */

import React, { useEffect, useState } from 'react';
import { socket } from '@/config/socket';
import { useAuth } from '@/hooks/useAuth';
import { SocketContext } from '@/hooks/SocketContext';

export const SocketProvider = ({ children }) => {
    const { user, logout } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);

    const userId = user?.uid || user?._id || user?.id || user?.conductorId || null;
    const userRole = (user?.rol || user?.role || 'conductor')?.toString()?.toLowerCase()?.trim() || 'conductor';

    useEffect(() => {
        if (userId) {
            const tokenSeguro = localStorage.getItem('cimco_token') || localStorage.getItem('token') || '';

            console.log(`⚡ [CIMCO-SOCKET] Identidad activa detectada [UID: ${userId} | Rol: ${userRole}]. Calibrando túnel duplex...`);
            
            socket.io.opts.query = {
                ...(socket.io.opts.query || {}),
                token: tokenSeguro,
                uid: userId,
                rol: userRole
            };

            socket.auth = {
                ...(socket.auth || {}),
                token: tokenSeguro,
                uid: userId
            };

            if (socket.io.opts) {
                socket.io.opts.auth = {
                    ...(socket.io.opts.auth || {}),
                    token: tokenSeguro,
                    uid: userId
                };
            }

            if (!socket.connected) {
                socket.connect();
            } else {
                socket.emit('unirse_sala', { uid: userId, rol: userRole });
            }
        } else {
            if (socket.connected) {
                console.log("🧹 [CIMCO-SOCKET] Desconexión explícita forzada por ausencia de sesión.");
                socket.disconnect();
            }
        }

        function onConnect() {
            setIsConnected(true);
            console.log(`🟢 [CIMCO-SOCKET] Conectado con éxito al Core Central de Despacho. ID Canal: ${socket.id}`);
            
            if (userId) {
                socket.emit('unirse_sala', { uid: userId, rol: userRole });
            }
        }

        function onDisconnect(reason) {
            setIsConnected(false);
            console.log(`🔴 [CIMCO-SOCKET] Canal perimetral desconectado. Motivo: ${reason}`);
        }

        function onConnectError(err) {
            console.error("❌ [CIMCO-SOCKET] Falló el apretón de manos (Handshake):", err?.message || err);
        }

        function onAuthExpired(data) {
            console.warn("⚠️ [CIMCO-SOCKET] Sesión expirada desde socket:", data);
            
            try {
                if (socket && socket.connected) {
                    socket.disconnect();
                }
            } catch (e) {
                console.error("Error durante desconexión de socket:", e);
            }

            if (typeof logout === 'function') {
                try {
                    logout();
                } catch (e) {
                    console.error("Error al invocar logout() en AuthProvider:", e);
                }
            }

            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.clear();
            }

            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }

        function onSolicitudViajeDisponible(viajeData) {
            if (!viajeData) return;
            console.log('🚨 ¡NUEVA SOLICITUD DE VIAJE RECIBIDA EN CANAL GLOBAL!', viajeData);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('auth_expired', onAuthExpired);
        socket.on('viaje_difundido', onSolicitudViajeDisponible);
        socket.on('solicitud_servicio', onSolicitudViajeDisponible);
        socket.on('solicitud_viaje_disponible', onSolicitudViajeDisponible);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('auth_expired', onAuthExpired);
            socket.off('viaje_difundido', onSolicitudViajeDisponible);
            socket.off('solicitud_servicio', onSolicitudViajeDisponible);
            socket.off('solicitud_viaje_disponible', onSolicitudViajeDisponible);
        };
    }, [userId, userRole, logout]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;