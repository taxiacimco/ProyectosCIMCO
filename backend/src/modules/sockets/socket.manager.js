// Versión Arquitectura: V19.1 - Soporte de Orígenes Dinámicos CORS (HTTP/HTTPS) y Transporte Híbrido (WebSocket/Polling)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\sockets\socket.manager.js
 * Misión: Administrar el ciclo de vida de las conexiones, salas automáticas de aislamiento (empresa/usuario),
 *          telemetría GPS y flujo completo de subasta/despacho en tiempo real, garantizando la resolución dinámica
 *          de orígenes CORS (HTTP/HTTPS) y transporte dual (websocket y polling).
 * Ajuste V19.1: Inyección de matriz de orígenes dinámicos permitidos (HTTP/HTTPS) para Socket.io y aseguramiento del soporte de transportes ['websocket', 'polling'].
 */

import { socketAuthMiddleware } from '../../middleware/socketAuth.middleware.js';
import { actualizarRadarUbicacion } from '../conductores/conductor.controller.js';

const logSocket = (msg) => console.log(`[${new Date().toLocaleString('es-CO')}] ⚡ [SOCKET-MGR] ${msg}`);

// 📏 PARÁMETROS CRÍTICOS DE RED Y DESPACHO SPATIAL
const RADIO_DESPACHO_MAX_METROS = 5000; // 5 km ($5\text{ km}$ / $5000\text{ m}$)
const TIMEOUT_DESPACHO_MS = 60000;       // 60 segundos ($60\text{ s}$ / $60000\text{ ms}$)

// MAPA ATÓMICO DE TEMPORIZADORES DE VIAJE EN MEMORIA
const temporizadoresViaje = new Map();

// 🌐 ORIGENES PERMITIDOS DINÁMICOS PARA CONEXIONES DE SOCKET.IO (HTTP Y HTTPS)
export const origenesPermitidosSocket = [
  'http://localhost:5173',
  'https://frontend-opal-eight-58.vercel.app',
  'https://frontend-taxia-cimco.vercel.app',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://192.168.100.34:5173',
  'http://192.168.100.34:4173',
  'http://192.168.100.34:3000',
  'https://globosely-appreciative-zander.ngrok-free.dev',
  process.env.CLIENT_ORIGIN,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  process.env.CLIENT_ORIGIN_LOCAL,
  process.env.CLIENT_ORIGIN_IP,
  process.env.CLIENT_ORIGIN_TUNNEL,
  process.env.CLIENT_ORIGIN_VERCEL,
  process.env.CLIENT_ORIGIN_VERCEL_ALT,
  process.env.FRONTEND_BASE_URL,
  process.env.CLOUDFLARE_TUNNEL_URL
].filter(Boolean);

// 📡 EVALUADOR DE ORIGEN EN TIEMPO REAL PARA HANDSHAKE SOCKET.IO
export const isOriginAllowedSocket = (origin, callback) => {
    if (!origin || origenesPermitidosSocket.includes(origin) || /\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
    } else {
        callback(new Error('Bloqueado por política CORS Socket.IO de CIMCO'));
    }
};

// ⚙️ OPCIONES RECOMENDADAS DE CONFIGURACIÓN DE SERVER SOCKET.IO
export const socketCorsOptions = {
    cors: {
        origin: isOriginAllowedSocket,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
};

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
        console.error(`[SOCKET-MGR-ERROR] Fallo al notificar 'auth_expired' y forzar desconexión:`, err?.message || err);
    }
};

export const inicializarSockets = (io) => {
    if (!io) {
        console.error('⚠️ [SOCKET-MGR-FATAL] Instancia io no proporcionada para la inicialización.');
        return;
    }

    // Blindaje de transportes soportados en la instancia activa
    if (io.opts) {
        io.opts.transports = ['websocket', 'polling'];
    }
    
    // Inyección obligatoria de la pasarela de seguridad JWT
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const { usuarioId, rol, empresaId: empresaIdSocket, cooperativaId } = socket;

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
        socket.join(usuarioId);            // Sala privada primaria
        socket.join(`user_${usuarioId}`);  // Sala estructurada por usuario
        
        const idEmpresaInicial = empresaIdSocket || cooperativaId;
        if (idEmpresaInicial) {
            socket.empresaId = idEmpresaInicial;
            socket.join(`empresa_${idEmpresaInicial}`);
            logSocket(`Asignación inicial a sala de empresa: empresa_${idEmpresaInicial}`);
        }

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
        // 1.1. REGISTRO DINÁMICO DE SALAS Y PERFIL ACTIVO
        // ==================================================
        socket.on('registrar_socket', (payload = {}) => {
            try {
                const uId = payload.userId || payload.usuarioId || socket.usuarioId;
                const eId = payload.empresaId || payload.cooperativaId || socket.empresaId;
                const rActivo = payload.rol || socket.rol;

                if (uId) {
                    socket.usuarioId = uId;
                    socket.join(uId);
                    socket.join(`user_${uId}`);
                }

                if (eId) {
                    socket.empresaId = eId;
                    socket.join(`empresa_${eId}`);
                    logSocket(`Registro explícito en sala de empresa: empresa_${eId} | Socket: ${socket.id}`);
                }

                if (rActivo) {
                    socket.rol = rActivo;
                }

                socket.emit('registro_confirmado', {
                    status: 'OK',
                    socketId: socket.id,
                    usuarioId: uId,
                    empresaId: eId,
                    timestamp: new Date().toISOString()
                });

                logSocket(`Evento 'registrar_socket' procesado con éxito para UID: ${uId} | Empresa: ${eId || 'N/A'}`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en registrar_socket para ${socket.id}:`, err?.message || err);
            }
        });

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
                    id: socket.usuarioId,
                    conductorId: socket.usuarioId,
                    usuarioId: socket.usuarioId,
                    lat,
                    lng,
                    latitud: lat,
                    longitud: lng,
                    accuracy: datos.accuracy || 0,
                    updatedAt: datos.updatedAt || new Date().toISOString(),
                    rol: (socket.rol || rolLimpio),
                    subrol: datos.subrol || datos.rol || 'general',
                    cooperativa: datos.cooperativa || datos.empresa || socket.empresaId || null,
                    empresaId: datos.empresaId || socket.empresaId || null,
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
                        conductorId: socket.usuarioId
                    });
                    
                    // 🚀 OPTIMIZACIÓN: Persistencia asíncrona sin await para evitar cuellos de botella en Sockets
                    if (typeof actualizarRadarUbicacion === 'function') {
                        actualizarRadarUbicacion(socket.usuarioId, lat, lng).catch(err => {
                            console.error(`[SOCKET-MGR-ERROR] Error al persistir ubicación del conductor ${socket.usuarioId}:`, err?.message || err);
                        });
                    }

                } else if (rolLimpio === 'pasajero') {
                    socket.to('sala_conductores').emit('pasajero_movido', payloadUniversal);
                }

                // 🎚️ DIFUSIÓN CANÓNICA A CENTRAL DE CONTROL (Despachadores y Admins)
                socket.to('sala_despachadores').to('sala_admins').emit('actualizar_ubicacion', payloadUniversal);

            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error procesando telemetría de ${socket.usuarioId}:`, err?.message || err);
            }
        };

        socket.on('actualizar_ubicacion', procesarTelemetriaGPS);
        socket.on('actualizar_radar_gps', procesarTelemetriaGPS);

        // ==================================================
        // 3. FLUJO DE SUBASTA Y DESPACHO EN TIEMPO REAL
        // ==================================================

        /**
         * Manejador centralizado para la creación de solicitudes de viaje (Urbano e Intermunicipal / Despachador).
         * Filtra la distribución según el empresaId si el servicio corresponde a una flota/cooperativa.
         */
        const procesarCrearSolicitud = (datosSolicitud = {}) => {
            try {
                if (!socket.usuarioId && !datosSolicitud.usuarioId && !datosSolicitud.pasajeroId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosSolicitud) return;

                const viajeId = datosSolicitud.viajeId || datosSolicitud.solicitudId || datosSolicitud.id || datosSolicitud._id;
                const pasajeroId = datosSolicitud.pasajeroId || datosSolicitud.usuarioId || socket.usuarioId;
                const empresaId = datosSolicitud.empresaId || datosSolicitud.cooperativaId || socket.empresaId;

                // Extraer coordenadas de origen con blindaje anti-undefined
                const latOrigen = parseFloat(datosSolicitud.lat || datosSolicitud.latitud || datosSolicitud.origenLat || (datosSolicitud.origenCoords && datosSolicitud.origenCoords.lat));
                const lngOrigen = parseFloat(datosSolicitud.lng || datosSolicitud.longitud || datosSolicitud.origenLng || (datosSolicitud.origenCoords && datosSolicitud.origenCoords.lng));

                // Configuración de filtro geoespacial $near ($5000\text{ m}$)
                const filtroGeoespacial = (!isNaN(latOrigen) && !isNaN(lngOrigen)) ? {
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [lngOrigen, latOrigen] // GEOJSON: [lng, lat]
                            },
                            $maxDistance: RADIO_DESPACHO_MAX_METROS
                        }
                    }
                } : null;

                const payloadDespacho = {
                    ...datosSolicitud,
                    viajeId,
                    solicitudId: viajeId,
                    pasajeroId,
                    empresaId: empresaId || null,
                    radioMaximoMetros: RADIO_DESPACHO_MAX_METROS,
                    tiempoExpiracionMs: TIMEOUT_DESPACHO_MS,
                    filtroGeoespacial,
                    fechaSolicitud: new Date().toISOString()
                };

                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                }

                // 🎯 SEGMENTACIÓN ESTRICTA DE SALA POR EMPRESA / COOPERATIVA
                if (empresaId) {
                    // Emitir la oferta ÚNICAMENTE a los conductores pertenecientes a la sala de la empresa
                    io.to(`empresa_${empresaId}`).emit('nuevo_servicio_disponible', payloadDespacho);
                    io.to(`empresa_${empresaId}`).emit('nuevo_viaje_disponible', payloadDespacho);
                    logSocket(`Solicitud [${viajeId}] emitida EXCLUSIVAMENTE a sala: empresa_${empresaId}`);
                } else {
                    // Transmisión general radial urbana si no pertenece a una flota específica
                    io.to('sala_conductores').emit('nuevo_servicio_disponible', payloadDespacho);
                    io.to('sala_conductores').emit('nuevo_viaje_disponible', payloadDespacho);
                    logSocket(`Solicitud urbana [${viajeId}] difundida a 'sala_conductores'.`);
                }

                // Auditoría central para despachadores y administradores
                io.to('sala_despachadores').to('sala_admins').emit('auditoria_nuevo_viaje', payloadDespacho);

                // ⏱️ PROGRAMACIÓN DE EXPIRACIÓN AUTOMÁTICA DE SUBASTA (60 SEGUNDOS)
                if (viajeId) {
                    const timerId = setTimeout(() => {
                        logSocket(`⌛ [TIMEOUT] Solicitud/Viaje [${viajeId}] no fue adjudicado en 60s. Expirando...`);
                        
                        // Notificar expiración directa al pasajero o creador
                        if (pasajeroId) {
                            io.to(`user_${pasajeroId}`).to(pasajeroId).emit('viaje_expirado', {
                                viajeId,
                                motivo: 'tiempo_limite_excedido',
                                mensaje: 'No se recibieron ofertas o el tiempo tope de 60 segundos fue excedido.'
                            });
                        }

                        // Remover la solicitud de las pantallas activas
                        const canalRemocion = empresaId ? io.to(`empresa_${empresaId}`) : io.to('sala_conductores');
                        canalRemocion.to('sala_despachadores').to('sala_admins').emit('viaje_removido_radar', {
                            viajeId,
                            motivo: 'expirado_timeout_60s'
                        });

                        temporizadoresViaje.delete(viajeId);
                    }, TIMEOUT_DESPACHO_MS);

                    temporizadoresViaje.set(viajeId, timerId);
                }

            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en procesarCrearSolicitud:`, err?.message || err);
            }
        };

        socket.on('crear_solicitud', procesarCrearSolicitud);
        socket.on('solicitar_viaje', procesarCrearSolicitud);

        /**
         * Manejador de recepción de contraofertas / pujas enviadas por conductores.
         * Redirige la propuesta directamente al usuario o despachador que originó la solicitud.
         */
        socket.on('enviar_oferta', (datosOferta = {}) => {
            try {
                if (!socket.usuarioId && !datosOferta.conductorId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosOferta) return;

                const viajeId = datosOferta.viajeId || datosOferta.solicitudId;
                const conductorId = datosOferta.conductorId || socket.usuarioId;
                const pasajeroId = datosOferta.pasajeroId || datosOferta.usuarioId;
                const despachadorId = datosOferta.despachadorId;
                const empresaId = datosOferta.empresaId || socket.empresaId;
                const montoOferta = datosOferta.monto || datosOferta.tarifa || datosOferta.valor || 0;

                const payloadOferta = {
                    ...datosOferta,
                    viajeId,
                    solicitudId: viajeId,
                    conductorId,
                    monto: parseFloat(montoOferta),
                    tarifa: parseFloat(montoOferta),
                    timestamp: new Date().toISOString()
                };

                // 📬 Redireccionar oferta a las salas específicas del solicitante
                if (pasajeroId) {
                    io.to(`user_${pasajeroId}`).to(pasajeroId).emit('nueva_oferta', payloadOferta);
                }

                if (despachadorId) {
                    io.to(`user_${despachadorId}`).to(despachadorId).emit('nueva_oferta', payloadOferta);
                }

                // Notificar también al tablero de monitoreo de la empresa si está configurado
                if (empresaId) {
                    io.to(`empresa_${empresaId}`).emit('nueva_oferta_empresa', payloadOferta);
                }

                logSocket(`Oferta ($${montoOferta}) enviada por conductor [${conductorId}] para viaje [${viajeId}] a pasajero/despachador.`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en enviar_oferta:`, err?.message || err);
            }
        });

        /**
         * Manejador de aceptación de oferta por parte del pasajero o despachador.
         * Notifica al conductor ganador y cierra atómicamente la subasta para los demás participantes.
         */
        socket.on('aceptar_oferta', (datosAceptacion = {}) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosAceptacion) return;

                const viajeId = datosAceptacion.viajeId || datosAceptacion.solicitudId || datosAceptacion.id;
                const conductorId = datosAceptacion.conductorId || datosAceptacion.conductorSeleccionadoId;
                const pasajeroId = datosAceptacion.pasajeroId || socket.usuarioId;
                const empresaId = datosAceptacion.empresaId || socket.empresaId;

                // 🛑 CANCELAR TEMPORIZADOR DE EXPIRACIÓN (Subasta adjudicada con éxito)
                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                }

                // 1. Notificar al conductor seleccionado que su puja fue aceptada
                if (conductorId) {
                    const payloadConductor = {
                        viajeId,
                        solicitudId: viajeId,
                        conductorId,
                        pasajeroId,
                        datosAceptacion,
                        mensaje: '¡Tu oferta ha sido aceptada! Inicia el traslado hacia la ubicación del cliente.',
                        timestamp: new Date().toISOString()
                    };

                    io.to(`user_${conductorId}`).to(conductorId).emit('oferta_aceptada', payloadConductor);
                    io.to(`user_${conductorId}`).to(conductorId).emit('viaje_accepted_por_conductor', payloadConductor);
                }

                // 2. Notificar el cierre de subasta a la sala de la empresa / resto de conductores
                const payloadCierreSubasta = {
                    viajeId,
                    solicitudId: viajeId,
                    conductorId,
                    motivo: 'oferta_aceptada_cierre_subasta',
                    timestamp: new Date().toISOString()
                };

                if (empresaId) {
                    io.to(`empresa_${empresaId}`).emit('subasta_cerrada', payloadCierreSubasta);
                    io.to(`empresa_${empresaId}`).emit('viaje_removido_radar', payloadCierreSubasta);
                } else {
                    io.to('sala_conductores').emit('viaje_removido_radar', payloadCierreSubasta);
                }

                // 3. Notificar auditoría a despachadores y admins
                io.to('sala_despachadores').to('sala_admins').emit('auditoria_viaje_asignado', {
                    viajeId,
                    conductorId,
                    pasajeroId,
                    empresaId
                });

                logSocket(`Subasta del viaje [${viajeId}] CERRADA. Conductor adjudicado: [${conductorId}] | Pasajero: [${pasajeroId}].`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en aceptar_oferta:`, err?.message || err);
            }
        });

        // Mantenimiento de compatibilidad directa para eventos legados
        socket.on('aceptar_viaje', (datosAceptacion = {}) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosAceptacion || !datosAceptacion.pasajeroId) return;

                const viajeId = datosAceptacion.viajeId || datosAceptacion.id || datosAceptacion._id;

                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                }
                
                io.to(datosAceptacion.pasajeroId).to(`user_${datosAceptacion.pasajeroId}`).emit('viaje_accepted_por_conductor', {
                    viajeId,
                    conductorId: socket.usuarioId 
                });

                io.to('sala_conductores').emit('viaje_removido_radar', {
                    viajeId,
                    motivo: 'aceptado_por_conductor',
                    conductorId: socket.usuarioId
                });

                io.to('sala_despachadores').to('sala_admins').emit('auditoria_viaje_asignado', {
                    viajeId,
                    conductorId: socket.usuarioId,
                    pasajeroId: datosAceptacion.pasajeroId
                });

                logSocket(`Conductor [${socket.usuarioId}] asignado al viaje [${viajeId}] del pasajero [${datosAceptacion.pasajeroId}].`);
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en aceptar_viaje:`, err?.message || err);
            }
        });

        socket.on('cancelar_viaje', (datosCancelacion = {}) => {
            try {
                if (!socket.usuarioId) {
                    emitirSesionExpirada(socket, 'nodo_inexistente');
                    return;
                }

                if (!datosCancelacion) return;
                const viajeId = datosCancelacion.viajeId || datosCancelacion.id;
                const empresaId = datosCancelacion.empresaId || socket.empresaId;

                if (viajeId) {
                    limpiarTemporizadorViaje(viajeId);
                    
                    const payloadCancelacion = {
                        viajeId,
                        motivo: datosCancelacion.motivo || 'cancelado_por_usuario'
                    };

                    if (empresaId) {
                        io.to(`empresa_${empresaId}`).emit('viaje_removido_radar', payloadCancelacion);
                    } else {
                        io.to('sala_conductores').emit('viaje_removido_radar', payloadCancelacion);
                    }

                    io.to('sala_despachadores').to('sala_admins').emit('viaje_removido_radar', payloadCancelacion);

                    logSocket(`Viaje [${viajeId}] cancelado. Temporizador purgado y removido del radar.`);
                }
            } catch (err) {
                console.error(`[SOCKET-MGR-ERROR] Error en cancelar_viaje:`, err?.message || err);
            }
        });

        // ==================================================
        // 4. CIERRE Y AUDITORÍA DE CONEXIÓN
        // ==================================================
        socket.on('disconnect', (reason) => {
            logSocket(`Canal cerrado. UID: ${socket.usuarioId} | Canal: ${socket.id} | Causa: ${reason}`);
            
            // Notificar desconexión a la central si era un conductor activo
            if (['conductor', 'mototaxi', 'intermunicipal', 'motoparrillero', 'motocarga'].includes(rolLimpio)) {
                socket.to('sala_despachadores').to('sala_admins').emit('conductor_desconectado', { conductorId: socket.usuarioId });
            }
        });
    });
};

export default inicializarSockets;