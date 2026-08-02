// Versión Arquitectura: V15.6 - Proveedor de Sockets con Dependencias Finas Anti-Flicker
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo acoplado a la instancia centralizada V15.2.
 * Ajuste V15.6: Optimización de dependencias del useEffect basadas estrictamente en la identidad (userId/rol)
 *               para evitar reconexiones innecesarias ante mutaciones de saldo o perfil.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../config/socket';
import { useAuth } from './useAuth';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);

    // Extraemos la identidad única para evitar que mutaciones de saldo recarguen el listener
    const userId = user?.uid || user?._id || user?.id || user?.conductorId;
    const userRole = (user?.rol || user?.role || 'despachador').toLowerCase().trim();

    useEffect(() => {
        // 🔒 CONTROL DE CONEXIÓN BASADO EN LA SESIÓN OPERATIVA DEL USUARIO
        if (userId) {
            const tokenSeguro = localStorage.getItem('cimco_token');

            console.log(`⚡ [CIMCO-SOCKET] Identidad activa detectada [UID: ${userId}]. Calibrando túnel duplex...`);
            
            // 🔑 INYECCIÓN EN CALIENTE DE PARÁMETROS DE HANDSHAKE (Evita fugas de contexto)
            socket.io.opts.query = {
                token: tokenSeguro,
                uid: userId,
                rol: userRole
            };

            // Asegura que el backend reciba las credenciales en el objeto 'auth' del handshake
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

            // 🔄 FORCE HANDSHAKE: Forzar ciclo de reinicio de conexión solo al cambiar identidad
            if (socket.connected) {
                socket.disconnect();
            }
            socket.connect();
        } else {
            // 🧹 PURGA PREVENTIVA: Si no hay usuario en sesión, terminamos la conexión
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
            console.error("❌ [CIMCO-SOCKET] Falló el apretón de manos (Handshake):", err.message);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
    }, [userId, userRole]); // ⚡ DEPENDENCIAS FINAS: Previene reconexiones por cambios de saldo/perfil

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('🚨 [CIMCO-CONTEXT-ERR] useSocket debe ser utilizado strictly dentro de un SocketProvider.');
    }
    return context;
};