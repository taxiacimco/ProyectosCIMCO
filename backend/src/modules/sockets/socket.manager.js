// Versión Arquitectura: V18.0 - Filtro Espacial $near (5km) y Timeout Extendido de Despacho (60s) con Expiración
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\sockets\socket.manager.js
 * Misión: Administrar el ciclo de vida de las conexiones, salas automáticas, telemetría GPS y despacho en tiempo real.
 * Ajuste V18.0: Integración de filtro espacial $near (5 km / 5000 m), timeout de despacho extendido a 60 s (60000 ms) 
 *              con gestión atómica de temporizadores de expiración y difusión de eventos 'viaje_expirado' y 'viaje_removido_radar'.
 */

import { socketAuthMiddleware } from '../../middleware/socketAuth.middleware.js';
import { actualizarRadarUbicacion } from '../conductores/conductor.controller.js';

const logSocket = (msg) => console.log(`[${new Date().toLocaleString('es-CO')}] ⚡ [SOCKET-MGR] ${msg}`);

// 📏 PARÁMETROS CRÍTICOS DE RED Y DESPACHO SPATIAL
const RADIO_DESPACHO_MAX_METROS = 5000; // 5 km ($5\text{ km}$ / $5000\text{ m}$)
const TIMEOUT_DESPACHO_MS = 60000;       // 60 segundos ($60\text{ s}$ / $60000\text{ ms}$)

// MAPA ATÓMICO DE TEMPORIZADORES DE VIAJE EN MEMORIA
const temporizadoresViaje = new Map();

/**
 * Cancela y remueve de forma segura el temporizador de expiración de un viaje.
 * @param {string} viajeId - Identificador único del viaje.
 */
const limpiarTemporizadorViaje = (viajeId) => {
    if (!viajeId) return;
    if (temporizadoresViaje.has(viajeId)) {
        clearTimeout(temporizadoresViaje.get(viajeId));
        temporizadoresViaje.delete(viajeId);
        logSocket(`⏱️ Temporizador de expiración cancelado para el viaje: [${viajeId}]`);
    }
};

/**
 * Emite de forma garantizada el evento auth_expired al cliente y fuerza la desconexión del canal.
 * @param {Object} socket - Instancia del socket cliente.
 * @param {string} reason - Razón técnica de la expiración o invalidez del token.
 */
export const emitirSesionExpirada = (socket, reason = 'nodo_inexistente') => {
    try {
        if (!socket) return;
        logSocket(`⚠️ Emitiendo 'auth_expired' a socket ID: ${socket.id || 'N/A'} | Razón: ${reason}`);
        
        socket.emit('auth_expired', { 
            reason, 
            message: 'El nodo de identidad ha expirado o ya no existe en el clúster central.',
            timestamp: new Date().toISOString()
        });
        
        socket.disconnect(true);
    } catch (err) {
        console.error(`[SOCKET-MGR-ERROR] Fallo al notificar 'auth_expired' y forzar desconexión:`, err.message);
    }
};

export const inicializarSockets = (io) => {
    
    // Inyección obligatoria de la pasarela de seguridad JWT
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const { usuarioId, rol } = socket;

        // Guarda de Seguridad: Verificación inmediata de presencia del nodo de identidad
        if (!usuarioId) {
            logSocket(`❌ Intento de conexión denegado. Falta UID o token inválido en socket: ${socket.id}`);
            emitirSesionExpirada(socket, 'nodo_inexistente');
            return;
        }

        logSocket(`Dispositivo conectado y autenticado. Canal: ${socket.id} | UID: ${usuarioId} | Rol: ${rol}`);

        // ==================================================
        // 1. AUTO-ASIGNACIÓN DE SALAS CRÍTICAS (ROOMS)
        // ==================================================
        socket.join(usuarioId); // Sala privada por usuario
        
        const rolLimpio = (rol || 'usuario').toLowerCase().trim();
        let nombreSalaRol = 'sala_usuarios';

        if (['conductor', 'mototaxi', 'intermunicipal', 'motoparrillero', 'motocarga'].includes(rolLimpio)) {
            nombreSalaRol = 'sala_conductores';
        } else if (rolLimpio === 'pasajero' || rolLimpio === 'usuario') {
            nombreSalaRol = 'sala_pasajeros';
        } else if (rolLimpio === 'despachador') {
            nombreSalaRol = 'sala_despachadores';
        } else if (rolLimpio === 'admin' || rolLimpio === 'ceo') {
            nombreSalaRol = 'sala_admins';
        } else {
            nombreSalaRol = rolLimpio.endsWith('s') ? `sala_${rolLimpio}` : `sala_${rolLimpio}s`;
        }
        
        socket.join(nombreSalaRol);
        logSocket(`Asignación automatizada a salas completada: ${usuarioId} [Sala: ${nombreSalaRol}]`);

        // ==================================================
        // 2. TELEMETRÍA GPS Y DIFUSIÓN (DESACOPLADA)
        // ==================================================
        const procesarTelemetriaGPS = (datos) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datos) return;

                const latRaw = datos.lat !== undefined ? datos.lat : datos.latitud;
                const lngRaw = datos.lng !== undefined ? datos.lng : datos.longitud;

                const lat = parseFloat(latRaw);
                const lng = parseFloat(lngRaw);

                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                    return;
                }

                const payloadUniversal = {
                    id: usuarioId,
                    conductorId: usuarioId,
                    usuarioId,
                    lat,
                    lng,
                    latitud: lat,
                    longitud: lng,
                    accuracy: datos.accuracy || 0,
                    updatedAt: datos.updatedAt || new Date().toISOString(),
                    rol: rolLimpio,
                    subrol: datos.subrol || datos.rol || 'general',
                    cooperativa: datos.cooperativa || datos.empresa || null,
                    nombre: datos.nombre || datos.fullName || null,
                    placa: datos.placa || datos.vehiculo || null,
                    numeroInterno: datos.numeroInterno || datos.interno || null
                };

                // 📡 ENRUTAMIENTO Y DIFUSIÓN DE TELEMETRÍA
                if (['conductor', 'mototaxi', 'intermunicipal', 'motoparrillero', 'motocarga'].includes(rolLimpio)) {
                    // Difundir a la flota de pasajeros
                    socket.to('sala_pasajeros').emit('conductor_movido', {
                        lat,
                        lng,
                        subrol: payloadUniversal.subrol,
                        conductorId: usuarioId
                    });
                    
                    // 🚀 OPTIMIZACIÓN: Persistencia asíncrona sin await para evitar cuellos de botella en Sockets
                    if (typeof actualizarRadarUbicacion === 'function') {
                        actualizarRadarUbicacion(usuarioId, lat, lng).catch(err => {
                            console.error(`[SOCKET-MGR-ERROR] Error al persistir ubicación del conductor ${usuarioId}:`, err.message);
                        });
                    }

                } else if (rolLimpio === 'pasajero') {
                    socket.to('sala_conductores').emit('pasajero_movido', payloadUniversal);
                }

                // 🎚️ DIFUSIÓN CANÓNICA A CENTRAL DE CONTROL (Despachadores y Admins)
                socket.to('sala_despachadores').to('sala_admins').emit('actualizar_ubicacion', payloadUniversal);

            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error procesando telemetría de ${usuarioId}:`, err.message);
            }
        };

        socket.on('actualizar_ubicacion', procesarTelemetriaGPS);
        socket.on('actualizar_radar_gps', procesarTelemetriaGPS);

        // ==================================================
        // 3. FLUJO DE VIAJES CON FILTRO SPATIAL Y TIMEOUT (60s)
        // ==================================================
        socket.on('solicitar_viaje', (datosViaje) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosViaje) return;

                const viajeId = datosViaje.viajeId || datosViaje.id || datosViaje._id;
                const pasajeroId = datosViaje.pasajeroId || usuarioId;

                // Extraer coordenadas de origen con blindaje anti-undefined
                const latOrigen = parseFloat(datosViaje.lat || datosViaje.latitud || datosViaje.origenLat || (datosViaje.origenCoords && datosViaje.origenCoords.lat));
                const lngOrigen = parseFloat(datosViaje.lng || datosViaje.longitud || datosViaje.origenLng || (datosViaje.origenCoords && datosViaje.origenCoords.lng));

                // Configuración de filtro geoespacial $near ($5000\text{ m}$)
                const filtroGeoespacial = (!isNaN(latOrigen) && !isNaN(lngOrigen)) ? {
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [lngOrigen, latOrigen] // GEOJSON: [lng, lat]
                            },
                            $maxDistance: RADIO_DESPACHO_MAX_METROS // 5000 metros
                        }
                    }
                } : null;

                const payloadDespacho = {
                    ...datosViaje,
                    viajeId,
                    pasajeroId,
                    radioMaximoMetros: RADIO_DESPACHO_MAX_METROS,
                    tiempoExpiracionMs: TIMEOUT_DESPACHO_MS,
                    filtroGeoespacial,
                    fechaSolicitud: new Date().toISOString()
                };

                // Limpiar cualquier temporizador previo si existe colisión de ID
                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                }

                // Difusión radial del servicio
                io.to('sala_conductores').emit('nuevo_viaje_disponible', payloadDespacho);
                io.to('sala_despachadores').to('sala_admins').emit('auditoria_nuevo_viaje', payloadDespacho);
                
                logSocket(`Viaje [${viajeId || 'N/A'}] difundido en radio de ${RADIO_DESPACHO_MAX_METROS}m. Timeout: 60s.`);

                // ⏱️ PROGRAMACIÓN DE EXPIRACIÓN AUTOMÁTICA (60 SEGUNDOS)
                if (viajeId) {
                    const timerId = setTimeout(() => {
                        logSocket(`⌛ [TIMEOUT] Viaje [${viajeId}] no fue capturado en 60s. Emitiendo expiración...`);
                        
                        // Notificar expiración al pasajero
                        io.to(pasajeroId).emit('viaje_expirado', {
                            viajeId,
                            motivo: 'tiempo_limite_excedido',
                            mensaje: 'No se encontraron conductores disponibles en el radio de 5 km en 60 segundos.'
                        });

                        // Remover la oferta del radar radial de la flota y paneles de control
                        io.to('sala_conductores').to('sala_despachadores').to('sala_admins').emit('viaje_removido_radar', {
                            viajeId,
                            motivo: 'expirado_timeout_60s'
                        });

                        temporizadoresViaje.delete(viajeId);
                    }, TIMEOUT_DESPACHO_MS);

                    temporizadoresViaje.set(viajeId, timerId);
                }

            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en solicitar_viaje:`, err.message);
            }
        });

        socket.on('aceptar_viaje', (datosAceptacion) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosAceptacion || !datosAceptacion.pasajeroId) return;

                const viajeId = datosAceptacion.viajeId || datosAceptacion.id || datosAceptacion._id;

                // 🛑 CANCELAR TEMPORIZADOR DE EXPIRACIÓN (Se adjudicó exitosamente dentro del ventana de 60s)
                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                }
                
                io.to(datosAceptacion.pasajeroId).emit('viaje_accepted_por_conductor', {
                    viajeId,
                    conductorId: usuarioId 
                });

                // Remover la oferta del radar para el resto de la flota
                io.to('sala_conductores').emit('viaje_removido_radar', {
                    viajeId,
                    motivo: 'aceptado_por_conductor',
                    conductorId: usuarioId
                });

                io.to('sala_despachadores').to('sala_admins').emit('auditoria_viaje_asignado', {
                    viajeId,
                    conductorId: usuarioId,
                    pasajeroId: datosAceptacion.pasajeroId
                });

                logSocket(`Conductor [${usuarioId}] asignado al viaje [${viajeId}] del pasajero [${datosAceptacion.pasajeroId}].`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en aceptar_viaje:`, err.message);
            }
        });

        socket.on('cancelar_viaje', (datosCancelacion) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosCancelacion) return;
                const viajeId = datosCancelacion.viajeId || datosCancelacion.id;

                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                    
                    io.to('sala_conductores').to('sala_despachadores').to('sala_admins').emit('viaje_removido_radar', {
                        viajeId,
                        motivo: datosCancelacion.motivo || 'cancelado_por_usuario'
                    });

                    logSocket(`Viaje [${viajeId}] cancelado. Temporizador purgado y removido del radar.`);
                }
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en cancelar_viaje:`, err.message);
            }
        });

        // ==================================================
        // 4. CIERRE Y AUDITORÍA DE CONEXIÓN
        // ==================================================
        socket.on('disconnect', (reason) => {
            logSocket(`Canal cerrado. UID: ${usuarioId} | Canal: ${socket.id} | Causa: ${reason}`);
            
            // Notificar desconexión a la central si era un conductor activo
            if (['conductor', 'mototaxi', 'intermunicipal', 'motoparrillero', 'motocarga'].includes(rolLimpio)) {
                socket.to('sala_despachadores').to('sala_admins').emit('conductor_desconectado', { conductorId: usuarioId });
            }
        });
    });
};

export default inicializarSockets;