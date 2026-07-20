// Versión Arquitectura: V16.1.0 - Sincronización Radial Unificada con Difusión a Sala de Control
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\sockets\socket.manager.js
 * Misión: Administrar el ciclo de vida de las conexiones, salas automáticas y despacho en tiempo real.
 * Ajuste V16.1.0: Depreciación y remoción del evento redundante `actualizar_ubicacion_conductor`.
 * Se unifica el flujo en el estándar universal `actualizar_radar_gps` para liberar ciclos de CPU en el servidor.
 */
import { socketAuthMiddleware } from '#middleware/socketAuth.middleware.js';
import { actualizarRadarUbicacion } from '#modules/conductores/conductor.controller.js';

const logSocket = (msg) => console.log(`[${new Date().toLocaleString('es-CO')}] ⚡ [SOCKET-MGR] ${msg}`);

export const inicializarSockets = (io) => {
    
    // Inyección obligatoria de la pasarela de seguridad JWT en el apretón de manos
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const { usuarioId, rol } = socket;
        logSocket(`Dispositivo conectado y autenticado. Canal: ${socket.id} | UID: ${usuarioId} | Rol: ${rol}`);

        // ==================================================
        // 1. AUTO-ASIGNACIÓN DE SALAS CRÍTICAS (ROOMS)
        // ==================================================
        socket.join(usuarioId); // Sala privada personal para respuestas directas core-to-client
        socket.join(`sala_${rol}es`); // Clasificación gremial: 'sala_conductores', 'sala_pasajeros', 'sala_despachadores', 'sala_admins'
        logSocket(`Asignación automatizada a salas completada para el usuario: ${usuarioId}`);

        // ==================================================
        // 2. RADAR TELEMETRÍA REACTIVA (Universal GPS Guard v16.1)
        // ==================================================
        socket.on('actualizar_radar_gps', async (datos) => {
            // 🛡️ BLINDAJE DE VARIABLES (ANTI-UNDEFINED)
            if (!datos) return;
            const { lat, lng, accuracy, updatedAt } = datos;

            if (lat === undefined || lng === undefined || lat === null || lng === null) {
                console.warn(`[${new Date().toLocaleString('es-CO')}] ⚠️ [SOCKET-MGR-WARN] Trama GPS inválida omitida desde UID: ${usuarioId}`);
                return;
            }

            const payloadUniversal = {
                lat,
                lng,
                accuracy: accuracy || 0,
                updatedAt: updatedAt || new Date().toISOString(),
                usuarioId,
                rol,
                subrol: datos.subrol || 'general'
            };

            // 📡 ENRUTAMIENTO INTELIGENTE Y DIFUSIÓN MULTIPROPÓSITO
            if (rol === 'conductor') {
                // Notificar a pasajeros en rango
                socket.to('sala_pasajeros').emit('conductor_movido', {
                    lat,
                    lng,
                    subrol: payloadUniversal.subrol,
                    conductorId: usuarioId
                });
                // Persistencia atómica en la base NoSQL
                await actualizarRadarUbicacion(usuarioId, lat, lng);
            } else if (rol === 'pasajero') {
                // Notificar a la flota de conductores cercanos
                socket.to('sala_conductores').emit('pasajero_movido', payloadUniversal);
            }

            // 🎚️ RESTRANSMISIÓN CRÍTICA A LA SALA DE CONTROL (Despachadores y Administradores)
            // Esto permite que MapaOperativo.jsx reciba los movimientos de forma agnóstica sin importar el rol
            socket.to('sala_despachadores').emit('telemetria_central_radar', payloadUniversal);
            socket.to('sala_admins').emit('telemetria_central_radar', payloadUniversal);

            // Trazabilidad de versión en logs de producción (Terminal 2)
            logSocket(`TELEMETRÍA-RADAR [${rol.toUpperCase()}] -> UID: ${usuarioId.substring(0, 8)}... | Lat: ${lat} | Lng: ${lng} | Precisión: ${accuracy}m -> Emitido a Central.`);
        });

        // ==================================================
        // 3. FLUJO DE VIAJES (Despacho en La Jagua)
        // ==================================================
        socket.on('solicitar_viaje', (datosViaje) => {
            if (!datosViaje) return;
            
            io.to('sala_conductores').emit('nuevo_viaje_disponible', {
                ...datosViaje,
                pasajeroId: usuarioId 
            });
            
            // También notificamos a los despachadores para que auditen el nuevo viaje solicitado en su panel
            io.to('sala_despachadores').emit('auditoria_nuevo_viaje', { ...datosViaje, pasajeroId: usuarioId });
            
            logSocket(`Viaje [${datosViaje.viajeId || 'N/A'}] difundido exitosamente a la flota radial.`);
        });

        socket.on('aceptar_viaje', (datosAceptacion) => {
            if (!datosAceptacion) return;
            
            io.to(datosAceptacion.pasajeroId).emit('viaje_accepted_por_conductor', {
                viajeId: datosAceptacion.viajeId,
                conductorId: usuarioId 
            });

            // Sincronizar estado con la central de despacho
            io.to('sala_despachadores').emit('auditoria_viaje_asignado', {
                viajeId: datosAceptacion.viajeId,
                conductorId: usuarioId,
                pasajeroId: datosAceptacion.pasajeroId
            });

            logSocket(`Conductor [${usuarioId}] asignado al viaje del pasajero [${datosAceptacion.pasajeroId}].`);
        });

        // ==================================================
        // 4. CIERRE DE CANAL
        // ==================================================
        socket.on('disconnect', () => {
            logSocket(`Canal perimetral cerrado de manera segura. UID: ${usuarioId} | Canal: ${socket.id}`);
        });
    });
};