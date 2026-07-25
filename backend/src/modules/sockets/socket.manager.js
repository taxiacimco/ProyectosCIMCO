// Versión Arquitectura: V16.9 - Telemetría Radial, Desacoplamiento de BD y Difusión Multi-Sala
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\sockets\socket.manager.js
 * Misión: Administrar el ciclo de vida de las conexiones, salas automáticas y despacho en tiempo real con alta latencia/concurrencia.
 * Ajuste V16.9: Normalización de imports relativos, tolerancia a fallos en el Event Loop y saneamiento de salas.
 */

import { socketAuthMiddleware } from '../../middleware/socketAuth.middleware.js';
import { actualizarRadarUbicacion } from '../conductores/conductor.controller.js';

const logSocket = (msg) => console.log(`[${new Date().toLocaleString('es-CO')}] ⚡ [SOCKET-MGR] ${msg}`);

export const inicializarSockets = (io) => {
    
    // Inyección obligatoria de la pasarela de seguridad JWT
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const { usuarioId, rol } = socket;
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

                // 🎚️ DIFUSIÓN DIRIGIDA A CENTRAL DE CONTROL (Despachadores y Admins)
                socket.to('sala_despachadores').to('sala_admins').emit('actualizar_ubicacion', payloadUniversal);
                socket.to('sala_despachadores').to('sala_admins').emit('telemetria_central_radar', payloadUniversal);

            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error procesando telemetría de ${usuarioId}:`, err.message);
            }
        };

        socket.on('actualizar_ubicacion', procesarTelemetriaGPS);
        socket.on('actualizar_radar_gps', procesarTelemetriaGPS);

        // ==================================================
        // 3. FLUJO DE VIAJES CON GUARDA PREVENTIVA
        // ==================================================
        socket.on('solicitar_viaje', (datosViaje) => {
            try {
                if (!datosViaje) return;
                
                io.to('sala_conductores').emit('nuevo_viaje_disponible', {
                    ...datosViaje,
                    pasajeroId: usuarioId 
                });
                
                io.to('sala_despachadores').to('sala_admins').emit('auditoria_nuevo_viaje', { 
                    ...datosViaje, 
                    pasajeroId: usuarioId 
                });
                
                logSocket(`Viaje [${datosViaje.viajeId || 'N/A'}] difundido a la flota radial.`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en solicitar_viaje:`, err.message);
            }
        });

        socket.on('aceptar_viaje', (datosAceptacion) => {
            try {
                if (!datosAceptacion || !datosAceptacion.pasajeroId) return;
                
                io.to(datosAceptacion.pasajeroId).emit('viaje_accepted_por_conductor', {
                    viajeId: datosAceptacion.viajeId,
                    conductorId: usuarioId 
                });

                io.to('sala_despachadores').to('sala_admins').emit('auditoria_viaje_asignado', {
                    viajeId: datosAceptacion.viajeId,
                    conductorId: usuarioId,
                    pasajeroId: datosAceptacion.pasajeroId
                });

                logSocket(`Conductor [${usuarioId}] asignado al viaje del pasajero [${datosAceptacion.pasajeroId}].`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en aceptar_viaje:`, err.message);
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