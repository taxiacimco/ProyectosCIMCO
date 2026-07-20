// Versión Arquitectura: V15.5 - Proveedor de Sockets con Blindaje en Handshake de Autorización y Gestión de Tokens
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo acoplado a la instancia centralizada V15.2[cite: 8].
 * Blindaje: Fuerza transporte nativo 'websocket', handshake TLS (wss://) en producción[cite: 8] e inyección 
 * robusta del token de autorización en las opciones de inicialización ('auth' y 'query') para evitar fallas de handshake.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../config/socket';
import { useAuth } from './useAuth'; 

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth(); 
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        // 🔒 CONTROL DE CONEXIÓN BASADO EN LA SESIÓN OPERATIVA DEL USUARIO[cite: 8]
        if (user) {
            const uidMapeado = user.id || user._id || user.uid;
            const tokenSeguro = localStorage.getItem('cimco_token') || localStorage.getItem('token');

            console.log(`⚡ [CIMCO-SOCKET] Identidad activa detectada [UID: ${uidMapeado}]. Calibrando túnel duplex...[cite: 8]`);
            
            // 🔑 INYECCIÓN EN CALIENTE DE PARÁMETROS DE HANDSHAKE (Evita fugas de contexto)[cite: 8]
            socket.io.opts.query = {
                token: tokenSeguro,
                uid: uidMapeado,
                rol: (user.rol || user.role || 'despachador').toLowerCase().trim()
            };

            // Asegura que el backend reciba las credenciales en el objeto 'auth' del handshake[cite: 8]
            socket.auth = {
                token: tokenSeguro,
                uid: uidMapeado
            };

            // Adicionalmente blindamos las opciones de conexión directa del gestor interno (socket.io.opts)
            if (socket.io.opts) {
                socket.io.opts.auth = {
                    token: tokenSeguro,
                    uid: uidMapeado
                };
            }

            // 🔄 FORCE HANDSHAKE: Forzar ciclo de reinicio de conexión para forzar la lectura de nuevos metadatos[cite: 8]
            if (socket.connected) {
                socket.disconnect();
            }
            socket.connect();
        } else {
            // 🧹 PURGA PREVENTIVA: Si no hay usuario en sesión, exterminamos cualquier conexión remanente[cite: 8]
            if (socket.connected) {
                console.log("🧹 [CIMCO-SOCKET] Desconexión explícita forzada por ausencia de sesión.[cite: 8]");
                socket.disconnect();
            }
        }

        // ==================================================================
        // 📡 MANEJADORES DE EVENTOS DEL RADAR CENTRAL[cite: 8]
        // ==================================================================
        function onConnect() {
            setIsConnected(true);
            console.log(`🟢 [CIMCO-SOCKET] Conectado con éxito al Core Central de Despacho. ID Canal: ${socket.id}[cite: 8]`);
        }

        function onDisconnect(reason) {
            setIsConnected(false);
            console.log(`🔴 [CIMCO-SOCKET] Canal perimetral desconectado. Motivo: ${reason}[cite: 8]`);
        }

        function onConnectError(err) {
            console.error("❌ [CIMCO-SOCKET] Falló el apretón de manos (Handshake):", err.message);
        }

        // Suscripción reactiva a los eventos del socket global[cite: 8]
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // Limpieza de suscripciones al desmontar el componente o cambiar de usuario[cite: 8]
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
        throw new Error('🚨 [CIMCO-CONTEXT-ERR] useSocket debe ser utilizado estrictamente dentro de un SocketProvider.[cite: 8]');
    }
    return context;
};