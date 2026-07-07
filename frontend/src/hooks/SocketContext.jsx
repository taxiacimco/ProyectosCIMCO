// Versión Arquitectura: V1.2 - Proveedor de Estado Global de Flujo Duplex (CIMCO-SOCKET-PROVIDER)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo con Inyección de Credenciales Dinámicas en Handshake.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../config/socket';
import { useAuth } from './useAuth'; 

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth(); 
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        // 🔒 Control de conexión basado en la sesión del usuario
        if (user) {
            console.log("⚡ [CIMCO-SOCKET] Detectada identidad activa. Abriendo túnel duplex...");
            
            // 🔑 Inyección dinámica del token/ID para pasar el blindaje del Handshake
            // Se asigna a 'query' para que coincida con la lectura perimetral del backend
            socket.io.opts.query = {
                token: user.id || user._id || user.token
            };

            socket.connect();
        } else {
            if (socket.connected) {
                console.log("🧹 [CIMCO-SOCKET] Purga preventiva. Cerrando conexión por ausencia de sesión.");
                socket.disconnect();
            }
        }

        function onConnect() {
            setIsConnected(true);
            console.log(`🟢 [CIMCO-SOCKET] Conectado con éxito al Core Central de Despacho. ID Canal: ${socket.id}`);
        }

        function onDisconnect() {
            setIsConnected(false);
            console.log("🔴 [CIMCO-SOCKET] Canal perimetral desconectado.");
        }

        function onConnectError(err) {
            console.error("❌ [CIMCO-SOCKET] Error en apretón de manos (Handshake):", err.message);
        }

        // Suscripción a eventos base de control
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('❌ useSocket debe ser utilizado dentro de un SocketProvider estructurado.');
    }
    return context;
};