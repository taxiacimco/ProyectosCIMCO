// Versión Arquitectura: V19.2 - Integración Sincronizada con Configuración Base de Sockets y Guards Anti-Undefined
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\SocketContext.jsx
 * Misión: Proveedor de Contexto Reactivo centralizado y unificado para la gestión de sockets en tiempo real.
 *         Mantiene sincronización de identidad (userId, rol, empresaId), estado reactivo de ofertas,
 *         captura global de expiración de token y wrappers de operaciones logísticas (crearSolicitud, enviarOferta, aceptarOferta).
 * Ajuste V19.2: Sincronización del estado de conexión con la instancia central de socket y refactorización de guardas de seguridad.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socket } from '@/config/socket';
import { useAuth } from '@/hooks/useAuth';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user, logout } = useAuth();
    const [isConnected, setIsConnected] = useState(socket?.connected || false);
    const [ofertas, setOfertas] = useState([]);

    const userId = user?.uid || user?._id || user?.id || user?.conductorId || null;
    const userRole = (user?.rol || user?.role || 'conductor')?.toString()?.toLowerCase()?.trim() || 'conductor';
    const empresaId = user?.empresaId || user?.empresa_id || user?.empresa || null;

    // Helper de emisión de registro de socket centralizado
    const emitirRegistroSocket = useCallback(() => {
        if (!userId || !socket?.connected) return;
        const payloadRegistro = {
            userId: String(userId),
            rol: userRole,
            empresaId: empresaId ? String(empresaId) : null,
            timestamp: new Date().toISOString()
        };
        console.log("⚡ [CIMCO-SOCKET] Emitiendo 'registrar_socket' con perfil activo:", payloadRegistro);
        socket.emit('registrar_socket', payloadRegistro);
        socket.emit('unirse_sala', { uid: String(userId), rol: userRole, empresaId });
    }, [userId, userRole, empresaId]);

    useEffect(() => {
        if (!socket) return;

        if (userId) {
            const tokenSeguro = localStorage.getItem('cimco_token') || localStorage.getItem('token') || '';

            console.log(`⚡ [CIMCO-SOCKET] Identidad activa detectada [UID: ${userId} | Rol: ${userRole} | Empresa: ${empresaId || 'N/A'}]. Calibrando túnel duplex...`);
            
            if (socket.io?.opts) {
                socket.io.opts.query = {
                    ...(socket.io.opts.query || {}),
                    token: tokenSeguro,
                    uid: userId,
                    rol: userRole,
                    empresaId: empresaId || ''
                };

                socket.io.opts.auth = {
                    ...(socket.io.opts.auth || {}),
                    token: tokenSeguro,
                    uid: userId,
                    rol: userRole,
                    empresaId: empresaId || ''
                };
            }

            socket.auth = {
                ...(socket.auth || {}),
                token: tokenSeguro,
                uid: userId,
                rol: userRole,
                empresaId: empresaId || ''
            };

            if (!socket.connected) {
                socket.connect();
            } else {
                emitirRegistroSocket();
            }
        } else {
            if (socket.connected) {
                console.log("🧹 [CIMCO-SOCKET] Desconexión explícita forzada por ausencia de sesión.");
                socket.disconnect();
            }
            setOfertas([]);
        }

        function onConnect() {
            setIsConnected(true);
            console.log(`🟢 [CIMCO-SOCKET] Conectado con éxito al Core Central de Despacho. ID Canal: ${socket.id}`);
            
            if (userId) {
                emitirRegistroSocket();
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

        function onNuevaOferta(nuevaOfertaData) {
            if (!nuevaOfertaData) return;
            console.log('⚡ [CIMCO-SOCKET] Nueva oferta recibida en canal reactivo:', nuevaOfertaData);
            setOfertas((prevOfertas) => {
                const ofertaIdNueva = nuevaOfertaData.id || nuevaOfertaData._id || nuevaOfertaData.ofertaId;
                const existe = prevOfertas.some((o) => {
                    const idExistente = o.id || o._id || o.ofertaId;
                    return idExistente && idExistente === ofertaIdNueva;
                });

                if (existe) {
                    return prevOfertas.map((o) => {
                        const idExistente = o.id || o._id || o.ofertaId;
                        return idExistente === ofertaIdNueva ? { ...o, ...nuevaOfertaData } : o;
                    });
                }
                return [...prevOfertas, nuevaOfertaData];
            });
        }

        function onOfertaActualizada(ofertaActualizada) {
            if (!ofertaActualizada) return;
            console.log('🔄 [CIMCO-SOCKET] Oferta actualizada:', ofertaActualizada);
            const ofertaIdTarget = ofertaActualizada.id || ofertaActualizada._id || ofertaActualizada.ofertaId;
            setOfertas((prev) => 
                prev.map((o) => {
                    const idExistente = o.id || o._id || o.ofertaId;
                    return idExistente === ofertaIdTarget ? { ...o, ...ofertaActualizada } : o;
                })
            );
        }

        function onLimpiarOfertas() {
            console.log('🧹 [CIMCO-SOCKET] Purgando estado reactivo de ofertas.');
            setOfertas([]);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('auth_expired', onAuthExpired);
        socket.on('viaje_difundido', onSolicitudViajeDisponible);
        socket.on('solicitud_servicio', onSolicitudViajeDisponible);
        socket.on('solicitud_viaje_disponible', onSolicitudViajeDisponible);
        socket.on('nueva_oferta', onNuevaOferta);
        socket.on('oferta_recibida', onNuevaOferta);
        socket.on('oferta_actualizada', onOfertaActualizada);
        socket.on('limpiar_ofertas', onLimpiarOfertas);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('auth_expired', onAuthExpired);
            socket.off('viaje_difundido', onSolicitudViajeDisponible);
            socket.off('solicitud_servicio', onSolicitudViajeDisponible);
            socket.off('solicitud_viaje_disponible', onSolicitudViajeDisponible);
            socket.off('nueva_oferta', onNuevaOferta);
            socket.off('oferta_recibida', onNuevaOferta);
            socket.off('oferta_actualizada', onOfertaActualizada);
            socket.off('limpiar_ofertas', onLimpiarOfertas);
        };
    }, [userId, userRole, empresaId, logout, emitirRegistroSocket]);

    // ==================================================================
    // WRAPPERS DE OPERACIONES LOGÍSTICAS (SOCKET)
    // ==================================================================

    /**
     * Emite la creación de una nueva solicitud de viaje al servidor
     */
    const crearSolicitud = useCallback((datosSolicitud = {}) => {
        if (!socket || !socket.connected) {
            console.warn("⚠️ [CIMCO-SOCKET] Imposible crear solicitud: socket desconectado.");
            return false;
        }
        const payload = {
            ...datosSolicitud,
            pasajeroId: datosSolicitud?.pasajeroId || userId,
            timestamp: new Date().toISOString()
        };
        console.log("📤 [CIMCO-SOCKET] Emitiendo 'crear_solicitud':", payload);
        socket.emit('crear_solicitud', payload);
        socket.emit('solicitar_viaje', payload);
        return true;
    }, [userId]);

    /**
     * Emite una oferta de conductor hacia un viaje disponible
     */
    const enviarOferta = useCallback((datosOferta = {}) => {
        if (!socket || !socket.connected) {
            console.warn("⚠️ [CIMCO-SOCKET] Imposible enviar oferta: socket desconectado.");
            return false;
        }
        const payload = {
            ...datosOferta,
            conductorId: datosOferta?.conductorId || userId,
            timestamp: new Date().toISOString()
        };
        console.log("📤 [CIMCO-SOCKET] Emitiendo 'enviar_oferta':", payload);
        socket.emit('enviar_oferta', payload);
        return true;
    }, [userId]);

    /**
     * Emite la aceptación de una oferta recibida
     */
    const aceptarOferta = useCallback((datosAceptacion = {}) => {
        if (!socket || !socket.connected) {
            console.warn("⚠️ [CIMCO-SOCKET] Imposible aceptar oferta: socket desconectado.");
            return false;
        }
        const payload = {
            ...datosAceptacion,
            pasajeroId: datosAceptacion?.pasajeroId || userId,
            timestamp: new Date().toISOString()
        };
        console.log("📤 [CIMCO-SOCKET] Emitiendo 'aceptar_oferta':", payload);
        socket.emit('aceptar_oferta', payload);
        return true;
    }, [userId]);

    return (
        <SocketContext.Provider 
            value={{ 
                socket, 
                isConnected, 
                ofertas, 
                setOfertas, 
                crearSolicitud, 
                enviarOferta, 
                aceptarOferta 
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

/**
 * Hook personalizado para consumir el contexto unificado de Sockets
 */
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        console.warn("⚠️ [CIMCO-SOCKET] useSocket debe ser utilizado dentro de un SocketProvider.");
    }
    return context;
};

export default SocketProvider;