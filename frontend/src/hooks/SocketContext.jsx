// Versión Arquitectura: V15.8 - Separación HMR Compliant de Contexto y Provider
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo acoplado a la instancia centralizada.
 */

import React, { createContext, useEffect, useState } from 'react';
import { socket } from '@/config/socket';
import { useAuth } from '@/hooks/useAuth';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);

    const userId = user?.uid || user?._id || user?.id || user?.conductorId;
    const userRole = (user?.rol || user?.role || 'despachador')?.toString()?.toLowerCase()?.trim() || 'despachador';

    useEffect(() => {
        if (userId) {
            const tokenSeguro = localStorage.getItem('cimco_token') || localStorage.getItem('token');

            console.log(`⚡ [CIMCO-SOCKET] Identidad activa detectada [UID: ${userId}]. Calibrando túnel duplex...`);
            
            socket.io.opts.query = {
                token: tokenSeguro,
                uid: userId,
                rol: userRole
            };

            socket.auth = {
                token: tokenSeguro,
                uid: userId
            };

            if (socket.io.opts) {
                socket.io.opts.auth = {
                    token: tokenSeguro,
                    uid: userId
                };
            }

            if (socket.connected) {
                socket.disconnect();
            }
            socket.connect();
        } else {
            if (socket.connected) {
                console.log("🧹 [CIMCO-SOCKET] Desconexión explícita forzada por ausencia de sesión.");
                socket.disconnect();
            }
        }

        function onConnect() {
            setIsConnected(true);
            console.log(`🟢 [CIMCO-SOCKET] Conectado con éxito al Core Central de Despacho. ID Canal: ${socket.id}`);
        }

        function onDisconnect(reason) {
            setIsConnected(false);
            console.log(`🔴 [CIMCO-SOCKET] Canal perimetral desconectado. Motivo: ${reason}`);
        }

        function onConnectError(err) {
            console.error("❌ [CIMCO-SOCKET] Falló el apretón de manos (Handshake):", err?.message || err);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
    }, [userId, userRole]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};